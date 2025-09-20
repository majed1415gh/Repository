const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

puppeteer.use(StealthPlugin());

// إعداد Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

console.log('🕷️ Tender Web Crawler Started');
console.log('✅ Connected to Supabase');

let browserInstance = null;
let isScrapingActive = false;

// إعدادات الزاحف المحدثة
const CRAWLER_CONFIG = {
    // فترة الانتظار بين المناقصات (بالملي ثانية)
    DELAY_BETWEEN_COMPETITIONS: 3000, // 3 ثواني
    // فترة الانتظار بين الصفحات (بالملي ثانية)
    DELAY_BETWEEN_PAGES: 5000, // 5 ثواني
    // فترة الراحة الطويلة (بالدقائق) - متفاوتة
    REST_INTERVALS: [15, 20, 25, 30], // 15-30 دقيقة
    // عدد الصفحات قبل الراحة
    PAGES_BEFORE_REST: 10,
    // فترة الانتظار بين الدورات الكاملة (بالساعات)
    CYCLE_INTERVAL_HOURS: 6,
    // عدد المنافسات المتوقع في كل صفحة
    COMPETITIONS_PER_PAGE: 6
};

async function getBrowserInstance() {
    if (!browserInstance) {
        console.log("🚀 Launching browser...");
        browserInstance = await puppeteer.launch({ 
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        });
        console.log("✅ Browser launched successfully");
    }
    return browserInstance;
}

// دالة للانتظار مع عشوائية لمحاكاة السلوك البشري
function humanDelay(baseDelay) {
    const randomFactor = 0.7 + Math.random() * 0.6; // بين 0.7 و 1.3
    return Math.floor(baseDelay * randomFactor);
}

// دالة للراحة الطويلة مع أوقات متفاوتة
async function takeRest() {
    const restMinutes = CRAWLER_CONFIG.REST_INTERVALS[Math.floor(Math.random() * CRAWLER_CONFIG.REST_INTERVALS.length)];
    const restMs = restMinutes * 60 * 1000;
    
    console.log(`😴 Taking a rest for ${restMinutes} minutes...`);
    console.log(`⏰ Will resume at: ${new Date(Date.now() + restMs).toLocaleString('ar-SA')}`);
    
    await new Promise(resolve => setTimeout(resolve, restMs));
    console.log('🔄 Resuming crawling...');
}

// دالة لمحاكاة حركة الماوس العشوائية
async function simulateHumanBehavior(page) {
    try {
        // حركة عشوائية للماوس
        const x = Math.floor(Math.random() * 800) + 100;
        const y = Math.floor(Math.random() * 600) + 100;
        await page.mouse.move(x, y);
        
        // انتظار عشوائي
        await new Promise(resolve => setTimeout(resolve, humanDelay(1000)));
        
        // التمرير العشوائي أحياناً
        if (Math.random() > 0.7) {
            const scrollY = Math.floor(Math.random() * 500) + 100;
            await page.evaluate((scroll) => {
                window.scrollBy(0, scroll);
            }, scrollY);
        }
    } catch (error) {
        console.log('⚠️ Human behavior simulation error (non-critical):', error.message);
    }
}

// دالة لاستخراج روابط المناقصات من صفحة النتائج
async function extractCompetitionLinks(page) {
    try {
        await page.waitForSelector('.tender-card', { timeout: 15000 });
        
        const competitions = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('.tender-card'));
            return cards.map(card => {
                const link = card.querySelector('a[href*="DetailsForVisitor"]');
                const refElement = card.querySelector('span, p, div');
                let referenceNumber = null;
                
                // البحث عن الرقم المرجعي في النص
                if (refElement) {
                    const allText = card.innerText;
                    const refMatch = allText.match(/(\d{8,})/);
                    if (refMatch) {
                        referenceNumber = refMatch[1];
                    }
                }
                
                // استخراج الموعد النهائي
                const deadlineRegex = /آخر موعد لتقديم العروض\s*(\d{4}-\d{2}-\d{2})\s*(\d{2}:\d{2})/;
                const deadlineMatch = card.innerText.match(deadlineRegex);
                let deadline = null;
                if (deadlineMatch && deadlineMatch[1] && deadlineMatch[2]) {
                    deadline = `${deadlineMatch[1]} ${deadlineMatch[2]}`;
                }
                
                return {
                    url: link ? link.href : null,
                    referenceNumber: referenceNumber,
                    deadline: deadline,
                    cardText: card.innerText.substring(0, 200) // للتشخيص
                };
            }).filter(comp => comp.url && comp.referenceNumber);
        });
        
        console.log(`📋 Found ${competitions.length} competitions on this page`);
        return competitions;
    } catch (error) {
        console.error('❌ Error extracting competition links:', error.message);
        return [];
    }
}

// دالة لسحب تفاصيل مناقصة واحدة (نفس البيانات من ملف الخادم)
async function scrapeCompetitionDetails(competitionInfo, page) {
    try {
        console.log(`🔍 Scraping details for: ${competitionInfo.referenceNumber}`);
        
        // التنقل لصفحة التفاصيل
        await page.goto(competitionInfo.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        // محاكاة السلوك البشري
        await simulateHumanBehavior(page);
        
        // انتظار تحميل صفحة التفاصيل
        const detailsHeaderXPath = "//h2[contains(., 'تفاصيل المنافسة')]";
        await page.waitForSelector(`xpath/${detailsHeaderXPath}`, { timeout: 20000 });
        
        // سحب البيانات الأساسية
        const competitionData = await page.evaluate(() => {
            const data = {};
            const headingsMap = {
                "اسم المنافسة": "name",
                "الرقم المرجعي": "referenceNumber",
                "قيمة وثائق المنافسة": "brochureCost",
                "نوع المنافسة": "competitionType",
                "مدة العقد": "contractDuration",
                "الجهة الحكوميه": "governmentEntity",
                "حالة المنافسة": "etimadStatus",
                "طريقة تقديم العروض": "submissionMethod",
                "آخر موعد لتقديم العروض": "deadline_details",
                "الغرض من المنافسة": "competition_purpose",
                "مطلوب ضمان الإبتدائي": "guarantee_required"
            };
            
            const findDataByLabel = (labelText) => {
                const labels = Array.from(document.querySelectorAll('.etd-item-title, .label, h3, span, p'));
                const targetLabel = labels.find(el => el.innerText && el.innerText.trim().includes(labelText));
                if (targetLabel && targetLabel.nextElementSibling) {
                    let valueElement = targetLabel.nextElementSibling;
                    if (valueElement && valueElement.innerText.trim()) return valueElement.innerText.trim();
                } else if (targetLabel) {
                    let parent = targetLabel.parentElement;
                    if (parent && parent.innerText.includes(labelText)) return parent.innerText.replace(labelText, '').trim();
                }
                return null;
            };
            
            for (const [arabicLabel, englishKey] of Object.entries(headingsMap)) {
                data[englishKey] = findDataByLabel(arabicLabel);
            }
            
            // الحصول على اسم المنافسة من العنوان إذا لم يوجد
            if (!data.name) {
                data.name = document.querySelector('h2')?.innerText.trim() || null;
            }
            
            // تنسيق قيمة الوثائق
            if (data.brochureCost) {
                data.brochureCost = parseFloat(data.brochureCost.replace(/[^0-9.]/g, '')) || 0;
            }
            
            return data;
        });

        // سحب بيانات نتائج الترسية (نفس المنطق من ملف الخادم)
        console.log("🏆 Attempting to scrape award results...");
        let awardData = { awarded_supplier: null, award_amount: null };
        
        try {
            const awardingTabSelector = '#awardingStepTab';
            const awardingTabExists = await page.$(awardingTabSelector);
            
            if (awardingTabExists) {
                console.log("📋 Found awarding tab, clicking...");
                await page.click(awardingTabSelector);
                
                // انتظار تحميل المحتوى
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // البحث عن الجدول والبيانات
                const awardTableData = await page.evaluate(() => {
                    const data = { awarded_supplier: null, award_amount: null };
                    
                    // البحث عن العنوان "قائمة الموردين المرسى عليهم"
                    const awardHeader = Array.from(document.querySelectorAll('h4')).find(h => 
                        h.innerText && h.innerText.includes('قائمة الموردين المرسى عليهم')
                    );
                    
                    if (awardHeader) {
                        console.log('Found award header, looking for table...');
                        // البحث عن الجدول بعد العنوان
                        let currentElement = awardHeader.nextElementSibling;
                        while (currentElement) {
                            if (currentElement.tagName === 'TABLE') {
                                const rows = currentElement.querySelectorAll('tbody tr');
                                if (rows.length > 0) {
                                    const firstRow = rows[0];
                                    const cells = firstRow.querySelectorAll('td');
                                    if (cells.length >= 3) {
                                        // إسم المورد (العمود الأول)
                                        data.awarded_supplier = cells[0].innerText.trim();
                                        // قيمة الترسية (العمود الثالث)
                                        const awardAmountText = cells[2].innerText.trim();
                                        const awardAmountMatch = awardAmountText.match(/[\d.,]+/);
                                        if (awardAmountMatch) {
                                            data.award_amount = parseFloat(awardAmountMatch[0].replace(/,/g, '')) || null;
                                        }
                                    }
                                }
                                break;
                            }
                            currentElement = currentElement.nextElementSibling;
                        }
                    } else {
                        // البحث عن نص "لم يتم اعلان نتائج الترسية بعد"
                        const noResultsText = document.body.innerText;
                        if (noResultsText.includes('لم يتم اعلان نتائج الترسية بعد')) {
                            data.awarded_supplier = 'لم يتم اعلان نتائج الترسية بعد';
                            data.award_amount = null;
                        }
                    }
                    
                    return data;
                });
                
                awardData = awardTableData;
                console.log(`🏆 Award data scraped: Supplier: ${awardData.awarded_supplier}, Amount: ${awardData.award_amount}`);
            } else {
                console.log("📋 Awarding tab not found, setting default values...");
                awardData = { awarded_supplier: 'غير متاح', award_amount: null };
            }
        } catch (error) {
            console.error('⚠️ Error scraping award data:', error.message);
            awardData = { awarded_supplier: 'خطأ في جلب البيانات', award_amount: null };
        }

        // دمج البيانات
        competitionData.deadline = competitionInfo.deadline;
        competitionData.awarded_supplier = awardData.awarded_supplier;
        competitionData.award_amount = awardData.award_amount;

        // معالجة الموعد النهائي إذا لم يكن متوفراً من الصفحة الرئيسية
        if (!competitionData.deadline && competitionData.deadline_details) {
            console.log("Using deadline from details page as a fallback.");
            const match = competitionData.deadline_details.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/);
            if (match) {
                const date = new Date(match[3], match[2] - 1, match[1], match[4], match[5]);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                competitionData.deadline = `${year}-${month}-${day} ${hours}:${minutes}`;
            }
        }
        
        delete competitionData.deadline_details;
        competitionData.competition_url = competitionInfo.url;
        
        // التأكد من وجود الرقم المرجعي
        if (!competitionData.referenceNumber) {
            competitionData.referenceNumber = competitionInfo.referenceNumber;
        }
        
        console.log(`✅ Successfully scraped: ${competitionData.name || 'Unknown'}`);
        return competitionData;
        
    } catch (error) {
        console.error(`❌ Error scraping competition ${competitionInfo.referenceNumber}:`, error.message);
        return null;
    }
}

// دالة لحفظ المناقصة في قاعدة البيانات
async function saveCompetitionToDatabase(competitionData) {
    try {
        // التحقق من وجود المناقصة أولاً
        const { data: existing, error: checkError } = await supabase
            .from('scraped_competitions')
            .select('id, reference_number')
            .eq('reference_number', competitionData.referenceNumber)
            .single();
        
        if (checkError && checkError.code !== 'PGRST116') {
            console.error('❌ Error checking existing competition:', checkError.message);
            return false;
        }
        
        const dbData = {
            name: competitionData.name,
            reference_number: competitionData.referenceNumber,
            brochure_cost: competitionData.brochureCost || 0,
            competition_type: competitionData.competitionType,
            contract_duration: competitionData.contractDuration,
            government_entity: competitionData.governmentEntity,
            etimad_status: competitionData.etimadStatus,
            submission_method: competitionData.submissionMethod,
            deadline: competitionData.deadline,
            competition_url: competitionData.competition_url,
            competition_purpose: competitionData.competition_purpose,
            guarantee_required: competitionData.guarantee_required,
            awarded_supplier: competitionData.awarded_supplier,
            award_amount: competitionData.award_amount
        };
        
        if (existing) {
            // تحديث البيانات الموجودة
            const { error: updateError } = await supabase
                .from('scraped_competitions')
                .update(dbData)
                .eq('id', existing.id);
            
            if (updateError) {
                console.error('❌ Error updating competition:', updateError.message);
                return false;
            }
            
            console.log(`🔄 Updated competition: ${competitionData.referenceNumber}`);
        } else {
            // إدراج مناقصة جديدة
            const { error: insertError } = await supabase
                .from('scraped_competitions')
                .insert(dbData);
            
            if (insertError) {
                console.error('❌ Error inserting competition:', insertError.message);
                return false;
            }
            
            console.log(`💾 Saved new competition: ${competitionData.referenceNumber}`);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error saving to database:', error.message);
        return false;
    }
}

// دالة للتحقق من وجود صفحة تالية والانتقال إليها
async function navigateToNextPage(page) {
    try {
        // البحث عن زر الصفحة التالية باستخدام الكود من الصورة
        const nextButtonExists = await page.evaluate(() => {
            // البحث عن navigation list
            const navList = document.querySelector('nav[aria-label="Page navigation"] ul.list-unstyled');
            if (!navList) return false;
            
            // البحث عن آخر عنصر في القائمة (زر التالي)
            const listItems = navList.querySelectorAll('li');
            if (listItems.length === 0) return false;
            
            const lastItem = listItems[listItems.length - 1];
            const nextButton = lastItem.querySelector('button[focusable="true"]');
            
            if (nextButton && !nextButton.disabled) {
                nextButton.click();
                return true;
            }
            
            return false;
        });
        
        if (nextButtonExists) {
            console.log('➡️ Navigating to next page...');
            // انتظار تحميل الصفحة الجديدة
            await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 });
            await new Promise(resolve => setTimeout(resolve, humanDelay(CRAWLER_CONFIG.DELAY_BETWEEN_PAGES)));
            return true;
        } else {
            console.log('📄 No more pages available or next button is disabled');
            return false;
        }
    } catch (error) {
        console.error('❌ Error navigating to next page:', error.message);
        return false;
    }
}

// دالة لسحب صفحة واحدة من المنافسات
async function scrapePage(page, pageNumber = 1) {
    try {
        console.log(`📄 Scraping page ${pageNumber}...`);
        
        // محاكاة السلوك البشري
        await simulateHumanBehavior(page);
        
        // استخراج روابط المناقصات
        const competitions = await extractCompetitionLinks(page);
        
        if (competitions.length === 0) {
            console.log('⚠️ No competitions found on this page');
            return { successCount: 0, hasNextPage: false };
        }
        
        let successCount = 0;
        
        // معالجة كل مناقصة
        for (let i = 0; i < competitions.length; i++) {
            const competition = competitions[i];
            
            try {
                console.log(`⏳ Processing ${i + 1}/${competitions.length}: ${competition.referenceNumber}`);
                
                const competitionData = await scrapeCompetitionDetails(competition, page);
                
                if (competitionData && competitionData.referenceNumber) {
                    const saved = await saveCompetitionToDatabase(competitionData);
                    if (saved) {
                        successCount++;
                    }
                }
                
                // انتظار بين المناقصات
                if (i < competitions.length - 1) {
                    const delay = humanDelay(CRAWLER_CONFIG.DELAY_BETWEEN_COMPETITIONS);
                    console.log(`⏸️ Waiting ${delay/1000}s before next competition...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                
            } catch (error) {
                console.error(`❌ Error processing competition ${competition.referenceNumber}:`, error.message);
            }
        }
        
        // التحقق من وجود صفحة تالية
        const hasNextPage = await navigateToNextPage(page);
        
        console.log(`✅ Page ${pageNumber} completed: ${successCount}/${competitions.length} competitions saved`);
        return { successCount, hasNextPage };
        
    } catch (error) {
        console.error(`❌ Error scraping page ${pageNumber}:`, error.message);
        return { successCount: 0, hasNextPage: false };
    }
}

// دالة لتشغيل دورة سحب كاملة مع التنقل بين جميع الصفحات
async function runScrapingCycle() {
    if (isScrapingActive) {
        console.log('⚠️ Scraping cycle already running, skipping...');
        return;
    }
    
    isScrapingActive = true;
    let page = null;
    
    try {
        console.log('\n🚀 Starting new comprehensive scraping cycle...');
        console.log(`📊 Config: Will scrape ALL pages, rest every ${CRAWLER_CONFIG.PAGES_BEFORE_REST} pages`);
        
        const browser = await getBrowserInstance();
        page = await browser.newPage();
        
        // إعداد الصفحة
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });
        
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // الانتقال للصفحة الأولى وتطبيق فلتر التاريخ
        const tendersUrl = 'https://tenders.etimad.sa/Tender/AllTendersForVisitor';
        console.log('🌐 Navigating to tenders page...');
        await page.goto(tendersUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        // تطبيق فلتر "في أى وقت" (نفس المنطق من ملف الخادم)
        console.log('📅 Setting publication date filter to "Any time"...');
        try {
            await page.waitForSelector('#searchBtnColaps', { visible: true });
            await page.click('#searchBtnColaps');
            
            await page.waitForSelector('a[href="#dates"]', { visible: true });
            await page.evaluate(selector => document.querySelector(selector).click(), 'a[href="#dates"]');
            
            await page.waitForSelector('#PublishDateId', { visible: true });
            await page.select('#PublishDateId', '1'); // '1' corresponds to 'فى أى وقت' (Any time)
            console.log("✅ Date filter set successfully.");
            
            // تطبيق الفلتر
            await page.waitForSelector('#searchBtn', { visible: true });
            await page.click('#searchBtn');
            
            // انتظار تحميل النتائج
            await page.waitForSelector('.tender-card', { timeout: 15000 });
            console.log("✅ Filter applied and results loaded.");
        } catch (error) {
            console.error('⚠️ Error applying date filter:', error.message);
            console.log('📄 Continuing without filter...');
        }
        
        let totalSaved = 0;
        let currentPage = 1;
        let pagesScraped = 0;
        let hasNextPage = true;
        
        // سحب جميع الصفحات
        while (hasNextPage) {
            console.log(`\n📖 === PAGE ${currentPage} ===`);
            
            const result = await scrapePage(page, currentPage);
            totalSaved += result.successCount;
            hasNextPage = result.hasNextPage;
            pagesScraped++;
            
            // أخذ راحة كل عدد معين من الصفحات
            if (pagesScraped % CRAWLER_CONFIG.PAGES_BEFORE_REST === 0 && hasNextPage) {
                await takeRest();
            }
            
            currentPage++;
            
            // انتظار بين الصفحات إذا كان هناك صفحة تالية
            if (hasNextPage) {
                const delay = humanDelay(CRAWLER_CONFIG.DELAY_BETWEEN_PAGES);
                console.log(`⏸️ Waiting ${delay/1000}s before next page...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        console.log(`\n✅ Scraping cycle completed!`);
        console.log(`📈 Total pages scraped: ${pagesScraped}`);
        console.log(`📈 Total competitions saved: ${totalSaved}`);
        console.log(`⏰ Next cycle in ${CRAWLER_CONFIG.CYCLE_INTERVAL_HOURS} hours\n`);
        
    } catch (error) {
        console.error('❌ Error in scraping cycle:', error.message);
    } finally {
        if (page) {
            await page.close();
        }
        isScrapingActive = false;
    }
}

// دالة لبدء الزاحف
async function startCrawler() {
    console.log('🎯 Starting comprehensive tender crawler...');
    console.log(`⚙️ Configuration:`);
    console.log(`   - Will scrape ALL pages (unlimited)`);
    console.log(`   - Competitions per page: ~${CRAWLER_CONFIG.COMPETITIONS_PER_PAGE}`);
    console.log(`   - Delay between competitions: ${CRAWLER_CONFIG.DELAY_BETWEEN_COMPETITIONS/1000}s`);
    console.log(`   - Delay between pages: ${CRAWLER_CONFIG.DELAY_BETWEEN_PAGES/1000}s`);
    console.log(`   - Rest every: ${CRAWLER_CONFIG.PAGES_BEFORE_REST} pages`);
    console.log(`   - Rest duration: ${CRAWLER_CONFIG.REST_INTERVALS.join('-')} minutes (random)`);
    console.log(`   - Cycle interval: ${CRAWLER_CONFIG.CYCLE_INTERVAL_HOURS}h`);
    
    // تشغيل الدورة الأولى
    await runScrapingCycle();
    
    // جدولة الدورات التالية
    setInterval(async () => {
        await runScrapingCycle();
    }, CRAWLER_CONFIG.CYCLE_INTERVAL_HOURS * 60 * 60 * 1000);
}

// معالجة إشارات النظام للإغلاق الآمن
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    
    if (browserInstance) {
        try {
            await browserInstance.close();
            console.log('✅ Browser closed');
        } catch (error) {
            console.error('❌ Error closing browser:', error);
        }
    }
    
    console.log('👋 Crawler stopped');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    
    if (browserInstance) {
        try {
            await browserInstance.close();
            console.log('✅ Browser closed');
        } catch (error) {
            console.error('❌ Error closing browser:', error);
        }
    }
    
    console.log('👋 Crawler stopped');
    process.exit(0);
});

// بدء الزاحف
startCrawler().catch(error => {
    console.error('❌ Fatal error starting crawler:', error);
    process.exit(1);
});

console.log('🕷️ Comprehensive Tender Web Crawler is running...');
console.log('Press Ctrl+C to stop');