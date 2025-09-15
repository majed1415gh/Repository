const express = require('express');
const puppeteer = require('puppeteer-extra');
const cors = require('cors');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const path = require('path'); // إضافة وحدة المسارات
require('dotenv').config();

puppeteer.use(StealthPlugin());

const app = express();
const PORT = 3001;
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);
console.log('Successfully connected to Supabase.');

let browserInstance = null;
async function getBrowserInstance() {
    if (!browserInstance) {
        console.log("Launching browser for the first time...");
        browserInstance = await puppeteer.launch({ headless: "new" });
        console.log("Browser is ready and running in the background.");
    }
    return browserInstance;
}

app.get('/api/competitions', async (req, res) => {
    const { data, error } = await supabase.from('competitions').select('*').order('dateAdded', { ascending: false });
    if (error) {
        console.error('Error fetching competitions:', error.message);
        return res.status(500).json({ message: 'Failed to fetch data from Supabase.', details: error.message });
    }
    res.status(200).json(data);
});

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
    
    // --- بداية التعديل: إنشاء اسم ملف آمن تمامًا ---
    // استخلاص امتداد الملف مثل ".pdf"
    const fileExtension = path.extname(displayName); 
    // إنشاء اسم جديد آمن باستخدام الوقت الحالي والامتداد
    const safeFilename = `${Date.now()}${fileExtension}`; 
    // المسار الكامل الذي سيتم حفظه في Supabase Storage
    const filePath = `${competitionId}/${safeFilename}`; 
    // --- نهاية التعديل ---

    console.log(`>> جاري رفع الملف إلى Supabase Storage بالاسم: ${filePath}`);

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file.buffer, { // استخدام المسار الآمن هنا
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
            file_name: displayName, // حفظ الاسم العربي الأصلي للعرض
            file_path: uploadData.path, // حفظ المسار الآمن في قاعدة البيانات
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

app.post('/api/scrape-and-save', async (req, res) => {
    const { searchInput } = req.body;
    if (!searchInput) {
        return res.status(400).json({ message: 'Please provide a reference number or a competition URL.' });
    }
    try {
        const scrapedData = await scrapeCompetitionData(searchInput);
        if (!scrapedData.referenceNumber) {
             throw new Error("Could not scrape the reference number. The competition might not exist.");
        }

        const { data: existingComp, error: checkError } = await supabase.from('competitions').select('id').eq('referenceNumber', scrapedData.referenceNumber).single();
        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking for existing competition:', checkError.message);
            return res.status(500).json({ message: 'Database error during check.', details: checkError.message });
        }
        
        if (existingComp) {
            console.log('Competition already exists. Updating it with fresh data...');
            const { data: updatedComp, error: updateError } = await supabase
                .from('competitions')
                .update(scrapedData)
                .eq('id', existingComp.id)
                .select()
                .single();
            
            if (updateError) {
                console.error('Error updating competition:', updateError.message);
                return res.status(500).json({ message: 'Failed to update existing data.' });
            }
            console.log('Competition updated successfully.');
            res.status(200).json(updatedComp);
        } else {
            console.log('Competition does not exist. Creating a new record...');
            const { data: newComp, error: insertError } = await supabase
                .from('competitions')
                .insert(scrapedData)
                .select()
                .single();
            if (insertError) {
                console.error('Error saving scraped data:', insertError.message);
                return res.status(500).json({ message: 'Failed to save new data.', details: insertError.message });
            }
            console.log('New competition saved successfully.');
            res.status(201).json(newComp);
        }
    } catch (error) {
        console.error("Error in /api/scrape-and-save:", error.message);
        res.status(500).json({ message: error.message });
    }
});

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
            
            await page.waitForSelector('#txtReferenceNumber', { visible: true });
            await page.type('#txtReferenceNumber', ref);

            await page.waitForSelector('#searchBtn', { visible: true });
            await page.click('#searchBtn');
            
            console.log(`3. Searching for the card with reference number: ${ref}`);
            const specificCardXPath = `//div[contains(@class, 'tender-card') and .//text()[contains(., '${ref}')]]`;
            
            try {
                await page.waitForSelector(`xpath/${specificCardXPath}`, { timeout: 30000 });
            } catch (e) {
                 throw new Error(`Competition with reference number ${ref} not found on the page.`);
            }
           
            console.log("4. Specific card found. Proceeding to scrape from it.");
            
            const cardHandle = await page.evaluateHandle((xpath) => {
                const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                return result.singleNodeValue;
            }, specificCardXPath);

            if (!cardHandle.asElement()) {
                 throw new Error(`Could not get a handle for the card with reference number ${ref}.`);
            }

            console.log("5. Scraping deadline from the correct card...");
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
            console.log(`6. Deadline found: ${deadlineFromSearch}`);

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
        
        console.log("7. Details page is ready for scraping.");
        const detailsHeaderXPath = "//h2[contains(., 'تفاصيل المنافسة')]";
        await page.waitForSelector(`xpath/${detailsHeaderXPath}`, { timeout: 20000 });

        console.log("8. Scraping data from details page...");
        const competitionData = await page.evaluate(() => {
            const data = {};
            const headingsMap = { "اسم المنافسة": "name", "الرقم المرجعي": "referenceNumber", "قيمة وثائق المنافسة": "brochureCost", "نوع المنافسة": "competitionType", "مدة العقد": "contractDuration", "الجهة الحكوميه": "governmentEntity", "حالة المنافسة": "etimadStatus", "طريقة تقديم العروض": "submissionMethod", "آخر موعد لتقديم العروض": "deadline_details" };
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
        
        competitionData.deadline = deadlineFromSearch;

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
        console.log("9. Data scraped successfully!", competitionData);
        return competitionData;

    } catch (error) {
        console.error(`Error during scraping process: ${error.message}`);
        throw new Error(error.message);
    } finally {
        if (page) {
            await page.close();
            console.log("10. Page closed, browser remains open for new requests.");
        }
    }
}

app.listen(PORT, () => {
    console.log(`🚀 Server is now running on http://localhost:${PORT}`);
    getBrowserInstance();
});