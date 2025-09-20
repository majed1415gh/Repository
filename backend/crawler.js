 to database:', error.message);
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