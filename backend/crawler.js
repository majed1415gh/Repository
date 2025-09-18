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

// إعدادات الزاحف
const CRAWLER_CONFIG = {
    // فترة الانتظار بين المناقصات (بالملي ثانية)
    DELAY_BETWEEN_COMPETITIONS: 5000, // 5 ثواني
    // فترة الانتظار بين الصفحات (بالملي ثانية)
    DELAY_BETWEEN_PAGES: 3000, // 3 ثواني
    // أقصى عدد من المناقصات لسحبها في الدورة الواحدة
    MAX_COMPETITIONS_PER_CYCLE: 50,
    // فترة الانتظار بين الدورات الكاملة (بالساعات)
    CYCLE_INTERVAL_HOURS: 6,
    // عدد الصفحات المراد زيارتها في كل دورة
    PAGES_TO_SCRAPE: 5
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
    const randomFactor = 0.5 + Math.random(); // بين 0.5 و 1.5
    return Math.floor(baseDelay * randomFactor);
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

// دالة لسحب تفاصيل مناقصة واحدة
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
        
        // سحب البيانات
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
                "آخر موعد لتقديم العروض": "deadline_details"
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
        
        // استخدام الموعد النهائي من الصفحة الرئيسية أولاً
        competitionData.deadline = competitionInfo.deadline;
        
        // إذا لم يوجد، حاول استخراجه من صفحة التفاصيل
        if (!competitionData.deadline && competitionData.deadline_details) {
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
        competitionData.competitionUrl = competitionInfo.url;
        
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
            competition_url: competitionData.competitionUrl
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

// دالة لسحب صفحة واحدة من المناقصات
async function scrapePage(page, pageNumber = 1) {
    try {
        console.log(`📄 Scraping page ${pageNumber}...`);
        
        const tendersUrl = `https://tenders.etimad.sa/Tender/AllTendersForVisitor?page=${pageNumber}`;
        await page.goto(tendersUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        // محاكاة السلوك البشري
        await simulateHumanBehavior(page);
        
        // استخراج روابط المناقصات
        const competitions = await extractCompetitionLinks(page);
        
        if (competitions.length === 0) {
            console.log('⚠️ No competitions found on this page');
            return 0;
        }
        
        let successCount = 0;
        let processedCount = 0;
        
        // معالجة كل مناقصة
        for (const competition of competitions) {
            if (processedCount >= CRAWLER_CONFIG.MAX_COMPETITIONS_PER_CYCLE) {
                console.log(`⏹️ Reached maximum competitions limit (${CRAWLER_CONFIG.MAX_COMPETITIONS_PER_CYCLE})`);
                break;
            }
            
            try {
                console.log(`⏳ Processing ${processedCount + 1}/${Math.min(competitions.length, CRAWLER_CONFIG.MAX_COMPETITIONS_PER_CYCLE)}: ${competition.referenceNumber}`);
                
                const competitionData = await scrapeCompetitionDetails(competition, page);
                
                if (competitionData && competitionData.referenceNumber) {
                    const saved = await saveCompetitionToDatabase(competitionData);
                    if (saved) {
                        successCount++;
                    }
                }
                
                processedCount++;
                
                // انتظار بين المناقصات
                if (processedCount < competitions.length) {
                    const delay = humanDelay(CRAWLER_CONFIG.DELAY_BETWEEN_COMPETITIONS);
                    console.log(`⏸️ Waiting ${delay/1000}s before next competition...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                
            } catch (error) {
                console.error(`❌ Error processing competition ${competition.referenceNumber}:`, error.message);
                processedCount++;
            }
        }
        
        console.log(`✅ Page ${pageNumber} completed: ${successCount}/${processedCount} competitions saved`);
        return successCount;
        
    } catch (error) {
        console.error(`❌ Error scraping page ${pageNumber}:`, error.message);
        return 0;
    }
}

// دالة لتشغيل دورة سحب كاملة
async function runScrapingCycle() {
    if (isScrapingActive) {
        console.log('⚠️ Scraping cycle already running, skipping...');
        return;
    }
    
    isScrapingActive = true;
    let page = null;
    
    try {
        console.log('\n🚀 Starting new scraping cycle...');
        console.log(`📊 Config: ${CRAWLER_CONFIG.PAGES_TO_SCRAPE} pages, max ${CRAWLER_CONFIG.MAX_COMPETITIONS_PER_CYCLE} competitions`);
        
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
        
        let totalSaved = 0;
        
        // سحب عدة صفحات
        for (let pageNum = 1; pageNum <= CRAWLER_CONFIG.PAGES_TO_SCRAPE; pageNum++) {
            const saved = await scrapePage(page, pageNum);
            totalSaved += saved;
            
            // انتظار بين الصفحات
            if (pageNum < CRAWLER_CONFIG.PAGES_TO_SCRAPE) {
                const delay = humanDelay(CRAWLER_CONFIG.DELAY_BETWEEN_PAGES);
                console.log(`⏸️ Waiting ${delay/1000}s before next page...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        console.log(`\n✅ Scraping cycle completed!`);
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
    console.log('🎯 Starting automatic tender crawler...');
    console.log(`⚙️ Configuration:`);
    console.log(`   - Pages per cycle: ${CRAWLER_CONFIG.PAGES_TO_SCRAPE}`);
    console.log(`   - Max competitions per cycle: ${CRAWLER_CONFIG.MAX_COMPETITIONS_PER_CYCLE}`);
    console.log(`   - Delay between competitions: ${CRAWLER_CONFIG.DELAY_BETWEEN_COMPETITIONS/1000}s`);
    console.log(`   - Delay between pages: ${CRAWLER_CONFIG.DELAY_BETWEEN_PAGES/1000}s`);
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

console.log('🕷️ Tender Web Crawler is running...');
console.log('Press Ctrl+C to stop');