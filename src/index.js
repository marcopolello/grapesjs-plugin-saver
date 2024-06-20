import grapesjs from "grapesjs";

import html2canvas from "html2canvas";
import html2pdf from "html2pdf.js";
import JSZip from "jszip";
import FileSaver from "file-saver";
import { Canvg } from "canvg";

export default grapesjs.plugins.add('gjs-plugin-saver', (editor, opts = {}) => {
  
  const pageManager = editor.Pages;
  const allPages = pageManager.getAll();
  const panelManager = editor.Panels;
  const commands = editor.Commands;
  let editPanel = null;

  // HobaPro : To prevent other exporting commands during exporting in process
  let inProcess = false;

  commands.add("editor:export:pages:image", {

      async run(editor) {

          if (inProcess) return;

          try {
              inProcess = true;

              const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');

              const currentPage = pageManager.getSelected();
          
              // Get an array of all pages
              const allPages = pageManager.getAll();
  
              for (const page in allPages) {
  
                pageManager.select(allPages[page]);

                // Delay to check HTML displaying
                await Delay(500);

                let canvas

                if (isFirefox) {
                  
                  this.ConvertSVG2Canvas(document.getElementsByTagName("iframe")[0].contentDocument.body);

                  canvas = await html2canvas(document.getElementsByTagName("iframe")[0].contentDocument.body, {
                    foreignObjectRendering: true,
                    allowTaint: true,
                    useCORS: true,
                  });
                }else {
                  canvas = await html2canvas(document.getElementsByTagName("iframe")[0].contentDocument.body, {
                    allowTaint: true,
                    useCORS: true,
                  });
                }

                // Create a link element to download the zip file
                const link = document.createElement('a');
                link.href = canvas.toDataURL(canvas);
                link.download = `pages_${page}.jpg`;
                
                // Trigger the download
                link.click();
              }
  
              pageManager.select(currentPage);
  
              inProcess = false;
          }
          catch(error) {

              inProcess = false;
              console.error(error);
          }
      },

    ConvertSVG2Canvas(element){
      const svgElements = element.querySelectorAll("svg");
      const svgDotBiElements = element.querySelectorAll("svg.bi");

      if (svgDotBiElements.length > 0) {
        let j;
        for (j = 0; j < svgDotBiElements.length; j++) {
          const useTags = svgDotBiElements[j].querySelectorAll("use");

          let r;
          for (r = 0; r < useTags.length; r++){
            const tempLinkAtt = useTags[r].getAttribute("xlink:href");
            useTags[r].removeAttribute("xlink:href");
            useTags[r].setAttribute("href", tempLinkAtt);
          }
        }
      }

      let i = 0;
      for (i = 0; i < svgElements.length; i++){

        // Create a canvas element
        const canvas = document.createElement("canvas");
        
        const ctx = canvas.getContext("2d");

        // Set canvas dimensions to match SVG
        canvas.width = svgElements[i].clientWidth;
        canvas.height = svgElements[i].clientHeight;

        // Get the SVG as XML string
        const svgXml = new XMLSerializer().serializeToString(svgElements[i]);

        // Replace the SVG with the canvas in the DOM
        svgElements[i].parentNode.replaceChild(canvas, svgElements[i]);

        // Convert SVG to Canvas
        let v = Canvg.fromString(ctx, svgXml);
        v.start();
      }
    }
  });

  commands.add("editor:export:pages:docx", {
    async run(editor) {

      if (inProcess) return;

      try {
        inProcess = true;

        const currentPage = pageManager.getSelected();

        const element2Docx = document.createElement("div");

        var header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' "+
        "xmlns:w='urn:schemas-microsoft-com:office:word' "+
        "xmlns='http://www.w3.org/TR/REC-html40'>"+
        "<head><meta charset='utf-8'><title>Export HTML to Word Document with JavaScript</title></head><body>";
        var footer = "</body></html>";
        var sourceHTML = header + editor.getHtml() + footer;

        // Get an array of all pages
        const allPages = pageManager.getAll();

        for (const pageIndex in allPages) {

          pageManager.select(allPages[pageIndex]);

          // Delay to check HTML displaying
          await Delay(500);

          this.ConvertSVG2Image(document.getElementsByTagName("iframe")[0].contentDocument.body);

          // Delay to check HTML Images is Converted
          await Delay(500);

          const pageMainContent = document.createElement("div");

          pageMainContent.innerHTML = document.getElementsByTagName("iframe")[0].contentDocument.body.innerHTML;

          element2Docx.appendChild(pageMainContent);
        }

        //return;
        var sourceHTML = header + element2Docx.outerHTML + footer;

        var source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        var fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        fileDownload.download = 'document.doc';
        fileDownload.click();
        document.body.removeChild(fileDownload);

        pageManager.select(currentPage);

        inProcess = false;
      }
      catch(error) {
        inProcess = false;
        console.log(error);
      }
    },

    ConvertSVG2Image(element) {
      const svgs = element.querySelectorAll("svg");

      let i;
      for (i = 0; i < svgs.length; i++) {
        const svgData = new XMLSerializer().serializeToString(svgs[i]);
        this.SVG2PNG(svgs[i], svgData, (svg, imgData) => {
            const pngImage = document.createElement("img");
            pngImage.src = imgData;
            pngImage.onload = () => {
                if (svg && svg.parentNode) {
                    svg.parentNode.replaceChild(pngImage, svg);
                }
            };
        });
      }
    },
    
    SVG2PNG(svg, svgData, callback) {
      const blob = new Blob([svgData], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
  
      img.onload = function () {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const imgData = canvas.toDataURL("image/png");
          callback(svg, imgData);
          URL.revokeObjectURL(url);
      };
  
      img.src = url;
    }
  });

  commands.add("editor:export:pages:pdf", {

    async run() {

        if (inProcess) return;

        try {
            inProcess = true;

            const currentPage = pageManager.getSelected();

            const element2pdf = document.createElement("div");

            // Get an array of all pages
            const allPages = pageManager.getAll();

            for (const pageIndex in allPages) {

              // or by passing the Page instance
              pageManager.select(allPages[pageIndex]);

              await Delay(500);

              const pageHtmlContent = document.createElement("div");

              pageHtmlContent.innerHTML = document.getElementsByTagName("iframe")[0].contentDocument.body.innerHTML;

              element2pdf.appendChild(pageHtmlContent);
            }

            pageManager.select(currentPage);

            html2pdf().set({
              margin: 0,
              image: { type: 'jpeg', quality: 0.20 },
              html2canvas: { scale: 2, useCORS: true },
              jsPDF: { unit: 'in', format: 'a4', orientation: 'p' },
            }).from(element2pdf).save('pages.pdf');

            inProcess = false;
        }
        catch(error) {

            inProcess = false;
            console.log(error);
        }
    },

    ConvertSVG2Image(element) {
      const svgs = element.querySelectorAll("svg");
  
      let i;
      for (i = 0; i < svgs.length; i++) {
          const svgData = new XMLSerializer().serializeToString(svgs[i]);
          this.SVG2PNG(svgs[i], svgData, (svg, imgData) => {
              const pngImage = document.createElement('img');
              pngImage.src = imgData;
              pngImage.onload = () => {
                  if (svg && svg.parentNode) {
                      svg.parentNode.replaceChild(pngImage, svg);
                  }
              };
          });
      }
    },
    
    SVG2PNG(svg, svgData, callback) {
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
    
        img.onload = function () {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imgData = canvas.toDataURL('image/png');
            callback(svg, imgData);
            URL.revokeObjectURL(url);
        };
    
        img.src = url;
    },
  });

  // Start Exporter

  const commandName = "editor:export:pages:zip";

  const config = {
    filenamePfx: opts.nameArchive ? opts.nameArchive : 'website_template',
    filename: undefined,
    done: () => {},
    onError: console.error,
    root: {
      css: {
        'style.css': (editor) => editor.getCss(),
      },
      'index.html': (editor) =>
        `\n<!doctype html>
        \n<html lang="en">
        \n  <head>
        \n    <meta charset="utf-8">
        \n   <link rel="stylesheet" href="./css/style.css">
        \n  </head>
        \n  <body>${editor.getHtml()}</body>
        \n</html>`,
    },
    isBinary: undefined,
    ...opts,
  };

  // Add command
  editor.Commands.add(commandName, {
    run(editor, s, opts = {}) {
        const zip = new JSZip();
        const onError = opts.onError || config.onError;
        const root = opts.root || config.root;
        
        // Iterate through all pages
        const allPages = editor.Pages.getAll();
        const data = {};
    
        let pageCSS = "";

        allPages.forEach(page => {
          const pageName = (page.get('name')) + '.html';

          const pageHTML = `\n <!doctype html>\
            \n<html lang="en">\
            \n<head>\
            \n<meta charset="utf-8">\
            \n<link rel="stylesheet" href="css/style-${page.cid}.css">\
            \n</head>\
            \n ` + page.getMainComponent().toHTML() + `
            \n</html>`;

          pageCSS += `/*Start ${page.get("name")} Styling*/

${editor.CodeManager.getCode(page.getMainComponent(), 'css')}

/*End ${page.get("name")} Styling*/


`;

          // Store HTML and CSS content for each page
          data[pageName] = pageHTML;
          data[`css/style.css`] = pageCSS;
          //data[`css/style-${page.cid}.css`] = pageCSS;
        });

        this.createDirectory(zip, data)
          .then(async () => {
            const content = await zip.generateAsync({ type: 'blob' });
            const filenameFn = opts.filename || config.filename;
            const done = opts.done || config.done;
            const filenamePfx = opts.filenamePfx || config.filenamePfx;
            const filename = filenameFn ? filenameFn(editor) : `${filenamePfx}_${Date.now()}.zip`;
            FileSaver.saveAs(content, filename);
            done();
        })
        .catch(onError);
    },

    createFile(zip, name, content) {
      const opts = {};
      const ext = name.split('.')[1];
      const isBinary = config.isBinary ?
        config.isBinary(content, name) :
        !(ext && ['html', 'css'].indexOf(ext) >= 0) &&
        !/^[\x00-\x7F]*$/.test(content);

      if (isBinary) {
        opts.binary = true;
      }

      editor.log(['Create file', { name, content, opts }], { ns: 'plugin-export' });
      zip.file(name, content, opts);
    },

    async createDirectory(zip, root) {
      root = typeof root === 'function' ? await root(editor) : root;

      for (const filename in root) {
        if (root.hasOwnProperty(filename)) {
          let content = root[filename];
          content = typeof content === 'function' ? await content(editor) : content;
          const typeOf = typeof content;

          if (typeOf === 'string') {
            this.createFile(zip, filename, content);
          } else if (typeOf === 'object') {
            const dirRoot = zip.folder(filename);
            await this.createDirectory(dirRoot, content);
          }
        }
      }
    },
  });

  // End Exporter

  panelManager.addButton('views', {
    id: 'vi-saver',
    attributes: {class: 'fa fa-floppy-o', title: "Pages"},
    active: false,
    command: {

      run: function () {
        if(editPanel == null){
            const editMenuDiv = document.createElement('div');
            editMenuDiv.innerHTML = `
                <button id="save-url-btn" class="save-page-btn">Save By URL</button>
                <button id="export-image-btn" class="save-page-btn">Export Images</button>
                <button id="export-docx-btn" class="save-page-btn">Export DOCX</button>
                <button id="export-pdf-btn" class="save-page-btn">Export PDF</button>
                <button id="export-all-btn" class="save-page-btn">Export All</button>
            `;

            const panels = panelManager.getPanel('views-container');

            panels.set('appendContent', editMenuDiv).trigger('change:appendContent');
            editPanel = editMenuDiv;

            this.Intialize_Exports_Buttons();
        }
        editPanel.style.display = 'flex';
        editPanel.style.alignItems = 'center';
        editPanel.style.justifyContent = 'center';
        editPanel.style.flexDirection = 'column';
      },

      stop: function () {
        if(editPanel != null){
            editPanel.style.display = 'none'
        }
      },

      Intialize_Exports_Buttons(){
        const save_btn = document.getElementById("save-url-btn");
        const export_images_btn = document.getElementById("export-image-btn");
        const export_docx_btn = document.getElementById("export-docx-btn");
        const export_pdf_btn = document.getElementById("export-pdf-btn");
        const export_all_btn = document.getElementById("export-all-btn");
    
        save_btn.onclick = () => {
          editor.store();
        }
        export_images_btn.onclick = () => {
          editor.runCommand("editor:export:pages:image");
        }
        export_docx_btn.onclick = () => {
          editor.runCommand("editor:export:pages:docx");
        }
        export_pdf_btn.onclick = () => {
          editor.runCommand("editor:export:pages:pdf");
        }
        export_all_btn.onclick = () => {
          editor.runCommand("editor:export:pages:zip");
        }
      }

    }
  });

  function Delay(delayTime){

    return new Promise((resolve, reject) => {

      setTimeout(() => {
        resolve();
      }, delayTime);
    });
  }
  
});