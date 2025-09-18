const express = require('express');
const puppeteer = require('puppeteer-extra');
const cors = require('cors');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

puppeteer.use(StealthPlugin());

const app = express();
const PORT = 3001;
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);
console.log('✅ Successfully connected to Supabase.');

let browserInstance = null;
async function getBrowserInstance() {
    if (!browserInstance) {
        console.log("🚀 Launching browser for the first time...");
        browserInstance = await puppeteer.launch({ headless: "new" });
        console.log("✅ Browser is ready and running in the background.");
    }
    return browserInstance;
}

// API للحصول على جميع المناقصات من الجدول الأساسي
app.get('/api/competitions', async (req, res) => {
    const { data, error } = await supabase.from('competitions').select('*').order('dateAdded', { ascending: false });
    if (error) {
        console.error('❌ Error fetching competitions:', error.message);
        return res.status(500).json({ message: 'Failed to fetch data from Supabase.', details: error.message });
    }
    res.status(200).json(data);
});

// API للحصول على المناقصات المسحوبة آلياً
app.get('/api/scraped-competitions', async (req, res) => {
    const { data, error } = await supabase.from('scraped_competitions').select('*').order('scraped_at', { ascending: false });
    if (error) {
        console.error('❌ Error fetching scraped competitions:', error.message);
        return res.status(500).json({ message: 'Failed to fetch scraped competitions.', details: error.message });
    }
    res.status(200).json(data);
});

// API محدث للبحث عن المناقصات - يبحث أولاً في الجدول الجديد
app.post('/api/search-competition', async (req, res) => {
    const { searchInput } = req.body;
    if (!searchInput) {
        return res.status(400).json({ message: 'Please provide a reference number or a competition URL.' });
    }

    try {
        console.log(`🔍 Searching for competition: ${searchInput}`);
        
        // استخراج الرقم المرجعي من الإدخال
        const referenceNumber = searchInput.startsWith('https://') ? 
            extractReferenceFromUrl(searchInput) : searchInput;
        
        if (!referenceNumber) {
            throw new Error('Could not extract reference number from input.');
        }

        // البحث أولاً في الجدول الأساسي
        console.log('🔎 البحث في الجدول الأساسي أولاً...');
        const { data: existingMainComp, error: mainCheckError } = await supabase
            .from('competitions')
            .select('*')
            .eq('referenceNumber', referenceNumber)
            .single();

        if (mainCheckError && mainCheckError.code !== 'PGRST116') {
            console.error('❌ Error checking main competitions:', mainCheckError.message);
            return res.status(500).json({ message: 'Database error during main check.', details: mainCheckError.message });
        }

        if (existingMainComp) {
            console.log('✅ تم العثور على المنافسة في الجدول الأساسي!');
            existingMainComp.source = 'existing';
            existingMainComp.message = 'المنافسة موجودة بالفعل في قاعدة البيانات';
            console.log('📊 البيانات من الجدول الأساسي (موجودة مسبقاً)');
            return res.status(200).json(existingMainComp);
        }

        // البحث في جدول المناقصات المسحوبة آلياً
        console.log('🔎 البحث في البيانات المسحوبة آلياً...');
        const { data: scrapedComp, error: scrapedError } = await supabase
            .from('scraped_competitions')
            .select('*')
            .eq('reference_number', referenceNumber)
            .single();

        if (scrapedError && scrapedError.code !== 'PGRST116') {
            console.error('❌ Error searching scraped competitions:', scrapedError.message);
            return res.status(500).json({ message: 'Database error during scraped search.', details: scrapedError.message });
        }

        if (scrapedComp) {
            console.log('✅ تم العثور على المنافسة في البيانات المسحوبة آلياً! (سريع)');
            // تحويل أسماء الأعمدة للتوافق مع الواجهة الأمامية
            const formattedComp = {
                id: scrapedComp.id,
                name: scrapedComp.name,
                referenceNumber: scrapedComp.reference_number,
                brochureCost: scrapedComp.brochure_cost,
                competitionType: scrapedComp.competition_type,
                contractDuration: scrapedComp.contract_duration,
                governmentEntity: scrapedComp.government_entity,
                etimadStatus: scrapedComp.etimad_status,
                submissionMethod: scrapedComp.submission_method,
                deadline: scrapedComp.deadline,
                competitionUrl: scrapedComp.competition_url,
                competitionPurpose: scrapedComp.competition_purpose,
                guaranteeRequired: scrapedComp.guarantee_required,
                awardedSupplier: scrapedComp.awarded_supplier,
                awardAmount: scrapedComp.award_amount,
                source: 'scraped_preview', // للعرض فقط، غير محفوظة في الجدول الأساسي
                message: 'البيانات متاحة للعرض - اضغط حفظ لإضافتها لقاعدة البيانات',
                lastUpdated: scrapedComp.scraped_at
            };
            console.log(`📊 البيانات من الجدول المسحوب آلياً - آخر تحديث: ${scrapedComp.scraped_at}`);
            return res.status(200).json(formattedComp);
        }

        // إذا لم توجد في أي مكان، قم بسحب البيانات من الموقع
        console.log('🕷️ المنافسة غير موجودة، جاري السحب المباشر من منصة اعتماد...');
        console.log('⏳ هذا قد يستغرق 30-60 ثانية، يرجى الانتظار...');
        const scrapedData = await scrapeCompetitionData(searchInput);
        
        if (!scrapedData.referenceNumber) {
            throw new Error("Could not scrape the reference number. The competition might not exist.");
        }

        console.log('✅ تم سحب المنافسة بنجاح من منصة اعتماد!');
        
        // إضافة معلومات للعرض فقط
        scrapedData.source = 'newly_scraped_preview';
        scrapedData.message = 'تم سحب البيانات بنجاح - اضغط حفظ لإضافتها لقاعدة البيانات';
        
        console.log('📊 البيانات تم سحبها حديثاً من منصة اعتماد (للعرض فقط)');

        res.status(200).json(scrapedData);

    } catch (error) {
        console.error("❌ Error in search-competition:", error.message);
        res.status(500).json({ message: error.message });
    }
});

// دالة لاستخراج الرقم المرجعي من الرابط
function extractReferenceFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const tenderId = urlObj.searchParams.get('TenderID');
        return tenderId;
    } catch (error) {
        console.error('Error extracting reference from URL:', error);
        return null;
    }
}

// باقي APIs الأصلية...
app.post('/api/competitions', async (req, res) => {
    const { id, ...compData } = req.body;
    for (const key in compData) {
        if (compData[key] === '' || compData[key] === undefined) {
            compData[key] = null;
        }
    }

    if (id) {
        const { data, error } = await supabase.from('competitions').update(compData).eq('id', id).select().single();
        if (error) {
            console.error('Error updating competition:', error.message);
            return res.status(500).json({ message: 'Failed to update competition.', details: error.message });
        }
        res.status(200).json({ message: 'Competition updated successfully', competition: data });
    } else {
        const { data, error } = await supabase.from('competitions').insert(compData).select().single();
        if (error) {
            console.error('Error adding competition:', error.message);
            return res.status(500).json({ message: 'Failed to add competition.', details: error.message });
        }
        res.status(201).json({ message: 'Competition added successfully', competition: data });
    }
});

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

app.post('/api/competitions/:competitionId/attachments', upload.single('file'), async (req, res) => {
    console.log('--- بدأ طلب رفع ملف جديد ---');
    const { competitionId } = req.params;
    const { file_type, original_name } = req.body; 
    const file = req.file;

    if (!file) {
        return res.status(400).send({ message: 'No file uploaded.' });
    }

    const displayName = original_name || file.originalname;
    console.log(`>> تم استلام ملف: ${displayName}, للمنافسة رقم: ${competitionId}`);
    
    const fileExtension = path.extname(displayName); 
    const safeFilename = `${Date.now()}${fileExtension}`; 
    const filePath = `${competitionId}/${safeFilename}`; 

    console.log(`>> جاري رفع الملف إلى Supabase Storage بالاسم: ${filePath}`);

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false
        });

    if (uploadError) {
        console.error('>> خطأ فادح أثناء الرفع إلى Supabase Storage:', uploadError.message);
        return res.status(500).json({ message: 'Failed to upload file to storage.', details: uploadError.message });
    }
    console.log('>> نجح الرفع إلى Supabase Storage. المسار:', uploadData.path);

    console.log('>> جاري حفظ بيانات الملف في قاعدة البيانات...');
    const { data: dbData, error: dbError } = await supabase
        .from('attachments')
        .insert({
            competition_id: competitionId,
            file_name: displayName,
            file_path: uploadData.path,
            file_type: file_type || 'attachment'
        })
        .select()
        .single();

    if (dbError) {
        console.error('>> خطأ فادح أثناء الحفظ في قاعدة البيانات:', dbError.message);
        return res.status(500).json({ message: 'Failed to save attachment info to database.' });
    }
    console.log('>> نجح الحفظ في قاعدة البيانات. ID السجل:', dbData.id);
    console.log('--- انتهى الطلب بنجاح ---');
    res.status(201).json({ message: 'File uploaded successfully.', attachment: dbData });
});

app.get('/api/competitions/:competitionId/attachments', async (req, res) => {
    const { competitionId } = req.params;
    
    const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('competition_id', competitionId);

    if (error) {
        console.error('Error fetching attachments:', error);
        return res.status(500).json({ message: 'Failed to fetch attachments.' });
    }
    
    res.status(200).json(data);
});

app.delete('/api/competitions/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('competitions').delete().eq('id', id);
    if (error) {
        console.error('Error deleting competition:', error.message);
        return res.status(500).json({ message: 'Failed to delete competition.' });
    }
    res.status(200).json({ message: 'Competition deleted successfully.' });
});

// API الأصلي للسحب والحفظ (للتوافق مع الواجهة القديمة)
app.post('/api/scrape-and-save', async (req, res) => {
    const { searchInput } = req.body;
    if (!searchInput) {
        return res.status(400).json({ message: 'Please provide a reference number or a competition URL.' });
    }
    
    console.log(`🔍 [SCRAPE-AND-SAVE] Searching for: ${searchInput}`);
    
    try {
        // استخراج الرقم المرجعي من الإدخال
        const referenceNumber = searchInput.startsWith('https://') ? 
            extractReferenceFromUrl(searchInput) : searchInput;
        
        if (!referenceNumber) {
            throw new Error('Could not extract reference number from input.');
        }

        // البحث أولاً في الجدول الأساسي
        console.log('🔎 [SCRAPE-AND-SAVE] البحث في الجدول الأساسي أولاً...');
        const { data: existingMainComp, error: mainCheckError } = await supabase
            .from('competitions')
            .select('*')
            .eq('referenceNumber', referenceNumber)
            .single();

        if (mainCheckError && mainCheckError.code !== 'PGRST116') {
            console.error('❌ Error checking main competitions:', mainCheckError.message);
            return res.status(500).json({ message: 'Database error during main check.', details: mainCheckError.message });
        }

        if (existingMainComp) {
            console.log('✅ [SCRAPE-AND-SAVE] المنافسة موجودة بالفعل في الجدول الأساسي!');
            console.log('📊 البيانات من الجدول الأساسي (موجودة مسبقاً)');
            return res.status(200).json({ 
                ...existingMainComp, 
                message: 'المنافسة موجودة بالفعل في قاعدة البيانات',
                source: 'existing'
            });
        }
        // البحث في جدول المناقصات المسحوبة آلياً
        console.log('🔎 [SCRAPE-AND-SAVE] البحث في البيانات المسحوبة آلياً أولاً...');
        const { data: scrapedComp, error: scrapedError } = await supabase
            .from('scraped_competitions')
            .select('*')
            .eq('reference_number', referenceNumber)
            .single();

        if (scrapedError && scrapedError.code !== 'PGRST116') {
            console.error('❌ Error searching scraped competitions:', scrapedError.message);
            return res.status(500).json({ message: 'Database error during scraped search.', details: scrapedError.message });
        }

        if (scrapedComp) {
            console.log('✅ [SCRAPE-AND-SAVE] تم العثور على المنافسة في البيانات المسحوبة آلياً! (سريع)');
            console.log(`📊 البيانات من الجدول المسحوب آلياً - آخر تحديث: ${scrapedComp.scraped_at}`);
            
            // تحويل البيانات للتوافق مع الجدول الأساسي وحفظها هناك
            const convertedData = {
                name: scrapedComp.name,
                referenceNumber: scrapedComp.reference_number,
                brochureCost: scrapedComp.brochure_cost,
                competitionType: scrapedComp.competition_type,
                contractDuration: scrapedComp.contract_duration,
                governmentEntity: scrapedComp.government_entity,
                etimadStatus: scrapedComp.etimad_status,
                submissionMethod: scrapedComp.submission_method,
                deadline: scrapedComp.deadline,
                competitionUrl: scrapedComp.competition_url,
                competition_purpose: scrapedComp.competition_purpose,
                guarantee_required: scrapedComp.guarantee_required,
                awarded_supplier: scrapedComp.awarded_supplier,
                award_amount: scrapedComp.award_amount
            };
            
            // إدراج جديد في الجدول الأساسي
            const { data: newComp, error: insertError } = await supabase
                .from('competitions')
                .insert(convertedData)
                .select()
                .single();
            
            if (insertError) {
                console.error('❌ Error inserting to main competitions:', insertError.message);
                return res.status(500).json({ message: 'Failed to save to main competitions.' });
            }
            
            console.log('💾 [SCRAPE-AND-SAVE] تم حفظ المنافسة في الجدول الأساسي من البيانات المسحوبة');
            return res.status(201).json(newComp);
        }

        // إذا لم توجد في أي مكان، قم بالسحب من الموقع
        console.log('🕷️ [SCRAPE-AND-SAVE] المنافسة غير موجودة في أي مكان، جاري السحب المباشر من منصة اعتماد...');
        console.log('⏳ هذا قد يستغرق 30-60 ثانية، يرجى الانتظار...');
        const scrapedData = await scrapeCompetitionData(searchInput);
        if (!scrapedData.referenceNumber) {
             throw new Error("Could not scrape the reference number. The competition might not exist.");
        }

        // حفظ البيانات المسحوبة في الجدول الجديد أولاً
        const scrapedCompData = {
            name: scrapedData.name,
            reference_number: scrapedData.referenceNumber,
            brochure_cost: scrapedData.brochureCost || 0,
            competition_type: scrapedData.competitionType,
            contract_duration: scrapedData.contractDuration,
            government_entity: scrapedData.governmentEntity,
            etimad_status: scrapedData.etimadStatus,
            submission_method: scrapedData.submissionMethod,
            deadline: scrapedData.deadline,
            competition_url: scrapedData.competitionUrl,
            competition_purpose: scrapedData.competition_purpose,
            guarantee_required: scrapedData.guarantee_required,
            awarded_supplier: scrapedData.awarded_supplier,
            award_amount: scrapedData.award_amount
        };

        const { error: saveScrapedError } = await supabase
            .from('scraped_competitions')
            .upsert(scrapedCompData, { onConflict: 'reference_number' });

        if (saveScrapedError) {
            console.error('⚠️ Warning: Could not save to scraped_competitions:', saveScrapedError.message);
        }
        
        // حفظ البيانات المسحوبة في الجدول الأساسي
        console.log('💾 [SCRAPE-AND-SAVE] إنشاء سجل جديد في الجدول الأساسي...');
        const { data: newComp, error: insertError } = await supabase
            .from('competitions')
            .insert(scrapedData)
            .select()
            .single();
        if (insertError) {
            console.error('❌ Error saving scraped data to main:', insertError.message);
            return res.status(500).json({ message: 'Failed to save new data.', details: insertError.message });
        }
        console.log('✅ [SCRAPE-AND-SAVE] تم حفظ المنافسة الجديدة في الجدول الأساسي');
        console.log('📊 البيانات تم سحبها حديثاً من منصة اعتماد');
        return res.status(201).json(newComp);
    } catch (error) {
        console.error("❌ Error in /api/scrape-and-save:", error.message);
        res.status(500).json({ message: error.message });
    }
});

// دالة سحب البيانات المحدثة مع الحقول الجديدة
async function scrapeCompetitionData(input) {
    const browser = await getBrowserInstance();
    let page = null;
    console.log(`1. [New Request] Opening new page for input: ${input}`);

    try {
        page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        const isUrl = input && input.startsWith('https://tenders.etimad.sa');
        let competitionUrl = '';
        let deadlineFromSearch = null;
        let ref = isUrl ? null : input;

        if (isUrl) {
            console.log(`2. URL detected, navigating directly...`);
            competitionUrl = input;
            await page.goto(competitionUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        } else {
            const tendersUrl = 'https://tenders.etimad.sa/Tender/AllTendersForVisitor';
            console.log(`2. No URL detected, searching by reference number: ${ref}`);
            await page.goto(tendersUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            
            await page.waitForSelector('#searchBtnColaps', { visible: true });
            await page.click('#searchBtnColaps');
            
            await page.waitForSelector('a[href="#dates"]', { visible: true });
            await page.evaluate(selector => document.querySelector(selector).click(), 'a[href="#dates"]');
            
            console.log("3. Setting publication date filter to 'Any time'...");
            await page.waitForSelector('#PublishDateId', { visible: true });
            await page.select('#PublishDateId', '1'); // '1' corresponds to 'فى أى وقت' (Any time)
            console.log("   ✅ Filter set successfully.");

            await page.waitForSelector('#txtReferenceNumber', { visible: true });
            await page.type('#txtReferenceNumber', ref);

            await page.waitForSelector('#searchBtn', { visible: true });
            await page.click('#searchBtn');
            
            console.log(`4. Searching for the card with reference number: ${ref}`);
            
            const specificCardXPath = `//div[contains(@class, 'tender-card') and .//text()[contains(., '${ref}')]]`;
            
            try {
                await page.waitForSelector(`xpath/${specificCardXPath}`, { timeout: 10000 });
            } catch (e) {
                 throw new Error(`Competition with reference number ${ref} not found on the page.`);
            }
           
            console.log("5. Specific card found. Proceeding to scrape from it.");
            
            const cardHandle = await page.evaluateHandle((xpath) => {
                const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                return result.singleNodeValue;
            }, specificCardXPath);

            if (!cardHandle.asElement()) {
                throw new Error(`Could not get a handle for the card with reference number ${ref}.`);
            }

            console.log("6. Scraping deadline from the correct card...");
            deadlineFromSearch = await cardHandle.evaluate((card) => {
                const allElements = Array.from(card.querySelectorAll('span, p, div, li'));
                const deadlineLabelElement = allElements.find(el => el.innerText && el.innerText.trim().includes('آخر موعد لتقديم العروض'));
                
                if (deadlineLabelElement) {
                    const parentText = deadlineLabelElement.parentElement.innerText;
                    const regex = /آخر موعد لتقديم العروض\s*(\d{4}-\d{2}-\d{2})\s*(\d{2}:\d{2})/;
                    const match = parentText.match(regex);
                    
                    if (match && match[1] && match[2]) {
                        return `${match[1]} ${match[2]}`;
                    }
                }
                return null;
            });
            console.log(`7. Deadline found: ${deadlineFromSearch}`);

            const detailsLinkHandle = await cardHandle.asElement().$('a[href*="DetailsForVisitor"]');
             if (!detailsLinkHandle) {
                throw new Error("Could not find details link in the correct competition card.");
            }
            
            competitionUrl = await detailsLinkHandle.evaluate(a => a.href);

            await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
                detailsLinkHandle.click()
            ]);
        }
        
        console.log("8. Details page is ready for scraping.");
        const detailsHeaderXPath = "//h2[contains(., 'تفاصيل المنافسة')]";
        await page.waitForSelector(`xpath/${detailsHeaderXPath}`, { timeout: 20000 });

        console.log("9. Scraping basic data from details page...");
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
            
            if (!data.name) data.name = document.querySelector('h2')?.innerText.trim() || null;
            if (data.brochureCost) {
                data.brochureCost = parseFloat(data.brochureCost.replace(/[^0-9.]/g, '')) || 0;
            }
            return data;
        });

        // سحب بيانات نتائج الترسية
        console.log("10. Attempting to scrape award results...");
        let awardData = { awardedSupplier: null, awardAmount: null };
        
        try {
            // البحث عن زر إعلان نتائج الترسية والضغط عليه
            const awardingTabSelector = '#awardingStepTab';
            const awardingTabExists = await page.$(awardingTabSelector);
            
            if (awardingTabExists) {
                console.log("11. Found awarding tab, clicking...");
                await page.click(awardingTabSelector);
                
                // انتظار تحميل المحتوى بدلاً من waitForTimeout
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // البحث عن الجدول والبيانات
                const awardTableData = await page.evaluate(() => {
                    const data = { awardedSupplier: null, awardAmount: null };
                    
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
                                        data.awardedSupplier = cells[0].innerText.trim();
                                        // قيمة الترسية (العمود الثالث)
                                        const awardAmountText = cells[2].innerText.trim();
                                        const awardAmountMatch = awardAmountText.match(/[\d.,]+/);
                                        if (awardAmountMatch) {
                                            data.awardAmount = parseFloat(awardAmountMatch[0].replace(/,/g, '')) || null;
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
                            data.awardedSupplier = 'لم يتم اعلان نتائج الترسية بعد';
                            data.awardAmount = null;
                        }
                    }
                    
                    return data;
                });
                
                awardData = awardTableData;
                console.log(`12. Award data scraped: Supplier: ${awardData.awardedSupplier}, Amount: ${awardData.awardAmount}`);
            } else {
                console.log("11. Awarding tab not found, setting default values...");
                awardData = { awardedSupplier: 'غير متاح', awardAmount: null };
            }
        } catch (error) {
            console.error('Error scraping award data:', error.message);
            awardData = { awardedSupplier: 'خطأ في جلب البيانات', awardAmount: null };
        }

        // دمج البيانات
        competitionData.deadline = deadlineFromSearch;
        competitionData.awarded_supplier = awardData.awardedSupplier;
        competitionData.award_amount = awardData.awardAmount;

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
        
        competitionData.competitionUrl = competitionUrl;
        console.log("13. All data scraped successfully!", competitionData);
        return competitionData;

    } catch (error) {
        console.error(`Error during scraping process: ${error.message}`);
        throw new Error(error.message);
    } finally {
        if (page) {
            await page.close();
            console.log("14. Page closed, browser remains open for new requests.");
        }
    }
}

app.listen(PORT, () => {
    console.log(`🚀 Enhanced Server is now running on http://localhost:${PORT}`);
    getBrowserInstance();
});