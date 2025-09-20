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

// متغيرات عامة
let browserInstance = null;
let isScrapingActive = false;

// إعدادات الزاحف
const CRAWLER_CONFIG = {
    COMPETITIONS_PER_PAGE: 6,
    DELAY_BETWEEN_COMPETITIONS: [3000, 7000], // 3-7 ثواني
    DELAY_BETWEEN_PAGES: [5000, 8000], // 5-8 ثواني
    PAGES_BEFORE_REST: 10, // راحة كل 10 صفحات
    REST_INTERVALS: [15, 30], // 15-30 دقيقة راحة
    CYCLE_INTERVAL_HOURS: 6, // دورة كل 6 ساعات
    MAX_PAGES_PER_CYCLE: null // لا محدود - سحب جميع الصفحات
};

// دالة للحصول على تأخير عشوائي (محاكاة السلوك البشري)
function humanDelay(range) {
    const [min, max] = Array.isArray(range) ? range : [range * 0.8, range * 1.2];
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// دالة للحصول على متصفح
async function getBrowserInstance() {
    if (!browserInstance) {
        console.log('🚀 Launching browser...');
        browserInstance = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });
        console.log('✅ Browser launched successfully');
    }
    return browserInstance;
}

// دالة لمحاكاة السلوك البشري
async function simulateHumanBehavior(page) {
    // تمرير عشوائي
    await page.evaluate(() => {
        window.scrollBy(0, Math.random() * 500);
    });
    
    // حركة ماوس عشوائية
    await page.mouse.move(
        Math.random() * 1000,
        Math.random() * 800
    );
    
    await page.waitForTimeout(humanDelay([500, 1500]));
}

// دالة لأخذ راحة طويلة
async function takeRest() {
    const restMinutes = humanDelay(CRAWLER_CONFIG.REST_INTERVALS);
    console.log(`😴 Taking a ${restMinutes}-minute rest to avoid detection...`);
    await new Promise(resolve => setTimeout(resolve, restMinutes * 60 * 1000));
    console.log('🔄 Resuming scraping...');
}

// دالة لاستخراج روابط المنافسات من الصفحة
async function extractCompetitionLinks(page) {
    return await page.evaluate(() => {
        const competitions = [];
        const cards = document.querySelectorAll('.tender-card');
        
        cards.forEach(card => {
            try {
                const link = card.querySelector('a[href*="DetailsForVisitor"]');
                const referenceElement = card.querySelector('.text-muted');
                
                if (link && referenceElement) {
                    const href = link.href;
                    const referenceText = referenceElement.textContent;
                    const referenceMatch = referenceText.match(/(\d+)/);
                    
                    if (referenceMatch) {
                        competitions.push({
                            url: href,
                            referenceNumber: referenceMatch[1]
                        });
                    }
                }
            } catch (error) {
                console.error('Error extracting competition:', error);
            }
        });
        
        return competitions;
    });
}

// دالة لسحب تفاصيل المنافسة
async function scrapeCompetitionDetails(competition, mainPage) {
    const browser = await getBrowserInstance();
    let detailPage = null;
    
    try {
        console.log(`🔍 Scraping details for: ${competition.referenceNumber}`);
        
        detailPage = await browser.newPage();
        await detailPage.setRequestInterception(true);
        detailPage.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });
        
        await detailPage.goto(competition.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        // انتظار تحميل تفاصيل المنافسة
        const detailsHeaderXPath = "//h2[contains(., 'تفاصيل المنافسة')]";
        await detailPage.waitForSelector(`xpath/${detailsHeaderXPath}`, { timeout: 20000 });
        
        // سحب البيانات الأساسية
        const competitionData = await detailPage.evaluate(() => {
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
            
            if (!data.name) data.name = document.querySelector('h2')?.innerText.trim() || null;
            if (data.brochureCost) {
                data.brochureCost = parseFloat(data.brochureCost.replace(/[^0-9.]/g, '')) || 0;
            }
            return data;
        });
        
        // سحب بيانات نتائج الترسية
        let awardData = { awarded_supplier: null, award_amount: null };
        
        try {
            const awardingTabSelector = '#awardingStepTab';
            const awardingTabExists = await detailPage.$(awardingTabSelector);
            
            if (awardingTabExists) {
                await detailPage.click(awardingTabSelector);
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const awardTableData = await detailPage.evaluate(() => {
                    const data = { awarded_supplier: null, award_amount: null };
                    
                    const awardHeader = Array.from(document.querySelectorAll('h4')).find(h => 
                        h.innerText && h.innerText.includes('قائمة الموردين المرسى عليهم')
                    );
                    
                    if (awardHeader) {
                        let currentElement = awardHeader.nextElementSibling;
                        while (currentElement) {
                            if (currentElement.tagName === 'TABLE') {
                                const rows = currentElement.querySelectorAll('tbody tr');
                                if (rows.length > 0) {
                                    const firstRow = rows[0];
                                    const cells = firstRow.querySelectorAll('td');
                                    if (cells.length >= 3) {
                                        data.awarded_supplier = cells[0].innerText.trim();
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
                        const noResultsText = document.body.innerText;
                        if (noResultsText.includes('لم يتم اعلان نتائج الترسية بعد')) {
                            data.awarded_supplier = 'لم يتم اعلان نتائج الترسية بعد';
                            data.award_amount = null;
                        }
                    }
                    
                    return data;
                });
                
                awardData = awardTableData;
            } else {
                awardData = { awarded_supplier: 'غير متاح', award_amount: null };
            }
        } catch (error) {
            console.error('Error scraping award data:', error.message);
            awardData = { awarded_supplier: 'خطأ في جلب البيانات', award_amount: null };
        }
        
        // دمج البيانات
        competitionData.awarded_supplier = awardData.awarded_supplier;
        competitionData.award_amount = awardData.award_amount;
        competitionData.competition_url = competition.url;
        
        // معالجة التاريخ
        if (competitionData.deadline_details) {
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
        
        console.log(`✅ Successfully scraped: ${competitionData.name}`);
        return competitionData;
        
    } catch (error) {
        console.error(`❌ Error scraping competition ${competition.referenceNumber}:`, error.message);
        return null;
    } finally {
        if (detailPage) {
            await detailPage.close();
        }
    }
}

// دالة لحفظ البيانات في قاعدة البيانات
async function saveCompetitionToDatabase(competitionData) {
    try {
        const scrapedCompData = {
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

        const { data, error } = await supabase
            .from('scraped_competitions')
            .upsert(scrapedCompData, { onConflict: 'reference_number' })
            .select()
            .single();

        if (error) {
            console.error('❌ Database error:', error.message);
            return false;
        }

        if (data) {
            console.log(`💾 Saved new competition: ${competitionData.referenceNumber}`);
        } else {
            console.log(`🔄 Updated competition: ${competitionData.referenceNumber}`);
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
        console.log('🔍 Looking for next page button...');
        
        // عرض URL الحالي
        const currentUrl = page.url();
        console.log(`🔗 Current URL: ${currentUrl}`);
        
        const nextButtonExists = await page.evaluate(() => {
            const navList = document.querySelector('nav[aria-label="Page navigation"] ul.list-unstyled');
            if (!navList) {
                console.log('Navigation list not found');
                return false;
            }
            
            const listItems = navList.querySelectorAll('li');
            if (listItems.length === 0) {
                console.log('No list items found');
                return false;
            }
            
            const lastItem = listItems[listItems.length - 1];
            const nextButton = lastItem.querySelector('button[focusable="true"]');
            
            if (nextButton && !nextButton.disabled) {
                console.log('Found next button, clicking...');
                nextButton.click();
                return true;
            } else {
                console.log('Next button not found or disabled');
                return false;
            }
        });
        
        if (nextButtonExists) {
            console.log('➡️ Navigating to next page...');
            await page.waitForTimeout(5000);
            await page.waitForSelector('.tender-card', { timeout: 15000 });
            await new Promise(resolve => setTimeout(resolve, humanDelay(CRAWLER_CONFIG.DELAY_BETWEEN_PAGES)));
            
            // التحقق من تغيير URL
            const newUrl = page.url();
            console.log(`🔗 New URL: ${newUrl}`);
            
            if (newUrl !== currentUrl) {
                console.log('✅ Successfully navigated to next page');
                return true;
            } else {
                console.log('⚠️ URL did not change, might be on last page');
                return false;
            }
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
        
        const currentUrl = page.url();
        console.log(`🔗 Current URL: ${currentUrl}`);
        
        await simulateHumanBehavior(page);
        
        const competitions = await extractCompetitionLinks(page);
        
        if (competitions.length === 0) {
            console.log('⚠️ No competitions found on this page');
            return { successCount: 0, hasNextPage: false };
        }
        
        console.log(`📋 Found ${competitions.length} competitions on page ${pageNumber}`);
        console.log(`🔢 Competition references: ${competitions.map(c => c.referenceNumber).join(', ')}`);
        
        let successCount = 0;
        
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
                
                if (i < competitions.length - 1) {
                    const delay = humanDelay(CRAWLER_CONFIG.DELAY_BETWEEN_COMPETITIONS);
                    console.log(`⏸️ Waiting ${delay/1000}s before next competition...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                
            } catch (error) {
                console.error(`❌ Error processing competition ${competition.referenceNumber}:`, error.message);
            }
        }
        
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
        
        const tendersUrl = 'https://tenders.etimad.sa/Tender/AllTendersForVisitor';
        console.log('🌐 Navigating to tenders page...');
        await page.goto(tendersUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        // تطبيق فلتر "في أى وقت"
        console.log('📅 Setting publication date filter to "Any time"...');
        try {
            await page.waitForSelector('#searchBtnColaps', { visible: true });
            await page.click('#searchBtnColaps');
            
            await page.waitForSelector('a[href="#dates"]', { visible: true });
            await page.evaluate(selector => document.querySelector(selector).click(), 'a[href="#dates"]');
            
            await page.waitForSelector('#PublishDateId', { visible: true });
            await page.select('#PublishDateId', '1');
            console.log("✅ Date filter set successfully.");
            
            await page.waitForSelector('#searchBtn', { visible: true });
            await page.click('#searchBtn');
            
            await page.waitForSelector('.tender-card', { timeout: 15000 });
            console.log("✅ Filter applied and results loaded.");
            
            await page.waitForTimeout(3000);
            
        } catch (error) {
            console.error('⚠️ Error applying date filter:', error.message);
            console.log('📄 Continuing without filter...');
        }
        
        let totalSaved = 0;
        let currentPage = 1;
        let pagesScraped = 0;
        let hasNextPage = true;
        
        while (hasNextPage) {
            console.log(`\n📖 === PAGE ${currentPage} ===`);
            
            const result = await scrapePage(page, currentPage);
            totalSaved += result.successCount;
            hasNextPage = result.hasNextPage;
            pagesScraped++;
            
            if (pagesScraped % CRAWLER_CONFIG.PAGES_BEFORE_REST === 0 && hasNextPage) {
                await takeRest();
            }
            
            currentPage++;
            
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
    console.log(`   - Delay between competitions: ${CRAWLER_CONFIG.DELAY_BETWEEN_COMPETITIONS[0]/1000}-${CRAWLER_CONFIG.DELAY_BETWEEN_COMPETITIONS[1]/1000}s`);
    console.log(`   - Delay between pages: ${CRAWLER_CONFIG.DELAY_BETWEEN_PAGES[0]/1000}-${CRAWLER_CONFIG.DELAY_BETWEEN_PAGES[1]/1000}s`);
    console.log(`   - Rest every: ${CRAWLER_CONFIG.PAGES_BEFORE_REST} pages`);
    console.log(`   - Rest duration: ${CRAWLER_CONFIG.REST_INTERVALS.join('-')} minutes (random)`);
    console.log(`   - Cycle interval: ${CRAWLER_CONFIG.CYCLE_INTERVAL_HOURS}h`);
    
    await runScrapingCycle();
    
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