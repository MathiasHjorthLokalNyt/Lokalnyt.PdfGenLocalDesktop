import puppeteer from 'puppeteer';
import PDFMerger from 'pdf-merger-js';

await Begin();

// WARNING!!
// Ungraceful shutdown of execution of this script can make it non-functional.
  //To fix it, try to execute the script again. If that does not work, reboot the host machine.


async function Begin(){

  const nextPageButtonSelector = "#screenNext";
  const pageIdSelector = "#page-Side"; //add pagenumber without whitespace
  const pageClassSelector = ".eavis-page";
  // const pdfFilePath = "./LokalNytHorsensUge34/" //use filepath variable from wherever instead of hardcoding
  const pdfFiles = new Array();
  const pdfFileBinaries = new Array();

  console.log("Launching browser")
  const browser = await puppeteer.launch({headless: true});
  const page = await browser.newPage();

  await page.setViewport({width: 793, height: 1123, deviceScaleFactor: 1});

  console.log("Navigating browser to: 'https://alpha.lokal-nyt.dk/e-avis/' ")
  try{
       await page.goto('https://alpha.lokal-nyt.dk/e-avis/',{waitUntil:"load",timeout:120_000});
  }
  catch(err){
      console.log("Puppeteer error: "+err)
      //terminate the browser instance
      console.log("Closing browser")
      await browser.close();
      return;
  }

  console.log("Setting media type");
  await page.emulateMediaType('print');


  const eavisLength = await GetEavisLength(page, pageClassSelector);
  for(let pageNumber = 1; pageNumber < eavisLength; pageNumber++)
  {
    let pageFileName = String(pageIdSelector+pageNumber);

    await MoveToNextPage(page,nextPageButtonSelector); 
    await EnsurePageScale(page,pageFileName);
    //consider using the buffer object when generating pdf instead of saving the pdf to disk
    let pageFileBinary = await GeneratePdf(page,pageFileName);

    //add to array
    pdfFiles[pageNumber-1] = (pageFileName); 
    pdfFileBinaries[pageNumber-1] = pageFileBinary;

  }

  console.log(":::MERGING FOLLOWING PAGES:::")
  console.log(pdfFiles);

  await MergePdfFiles(pdfFileBinaries);

  console.log("Closing browser")
  await browser.close();
}

async function GeneratePdf(page,pdfName){
    console.log("Generating PDF of page: "+pdfName);
   return await page.pdf(
    {
      // path: "./LokalNytHorsensUge34/"+pdfName, 
      printBackground: true, 
      displayHeaderFooter: false,
      format: "A4"
    });
}

async function MoveToNextPage(page,nextPageButtonSelector){
    console.log("Moving on to next page");
    await page.evaluate((nextPageButtonSelector) => {
        const nextPageButton = document.querySelector(nextPageButtonSelector);
        nextPageButton.click();
      },nextPageButtonSelector)
}

async function EnsurePageScale(page,currentPage){

  //Ensuring that the CSS transform property on the pages have applied to scale to 1x before generating a PDF
  console.log("Ensuring page scale");
  try{
    await page.evaluate((currentPage) => {
      let pageElement = document.querySelector(currentPage);
      if(pageElement !== undefined && pageElement !== null)
      {
        let inlineStyleOfElement = pageElement.getAttribute("style");
        let newStyle = inlineStyleOfElement.slice(0,-1); //Removing the last single ' mark of the style attribute value
        newStyle += "transition: none; transform: scale(1.0);'" //Overriding style attributes to ensure correct scaling for PDF generation
        pageElement.setAttribute("style", newStyle);
      }
  },currentPage);
  }catch(err)
  {
    console.log("Something went wrong trying to change the style attribute of element: "+currentPage+" Possible cause: Missing style attribute on the element");
  }
}

async function GetEavisLength(page, pageClassSelector){
   const result = await page.$$(pageClassSelector)
   return result.length;
}

async function MergePdfFiles(pdfFileBinaries){
    console.log("Merging pdf binaries")
    const merger = new PDFMerger();

    try{
      for(let i = 0; i < pdfFileBinaries.length; i++){
        await merger.add(pdfFileBinaries[i]);
      }
      await merger.save("LokalNytAlpha.pdf");
      console.log("Merge successfull")
    }
    catch(err){
      console.log(err)
    }
}