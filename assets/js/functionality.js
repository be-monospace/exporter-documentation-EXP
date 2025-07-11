/*------------------------
   Content menu tracking
-------------------------- */
/**
 * Navigates to a specific element on the page, handling elements within tabs
 * @param {(string|HTMLElement)} elementOrHash - Either a hash string (e.g. "#section1") or DOM element to navigate to
 */
function navigateToElement(elementOrHash) {
  // Handle both element and hash string cases by converting hash to element if needed
  const foundElement =
    typeof elementOrHash === 'string'
      ? document.querySelector(elementOrHash)
      : elementOrHash;

  if (foundElement) {
    // Check if element is inside a tab pane
    const tabPane = foundElement.closest('.tab-pane');
    if (tabPane) {
      const tabPaneId = tabPane.id;
      // Find the tabs container that contains this tab pane
      const tabsContainer = tabPane.closest('.content-block--tabs');
      if (tabsContainer) {
        // Find the tab that controls this tab pane — for both classical tabs and accordions
        const tab =
          tabsContainer.querySelector(`.nav-link[href="#${tabPaneId}"]`) ||
          tabsContainer.querySelector(`a[data-target="#${tabPaneId}"]`);

        if (tab) {
          // If tab pane is hidden, click the tab to show it
          if (!tabPane.classList.contains('show')) {
            tab.click();
          }

          // Wait for tab transition to complete before scrolling
          // tab transition takes 150ms, we wait a bit longer to be safe
          setTimeout(() => {
            foundElement.scrollIntoView({ block: 'start', inline: 'nearest' });
          }, 250);
        }
      }
    }
  }
}

$(document).ready(function() {
  // Setting the observer to set the scroll state of main navigation on the left
  // It is used in full_page.pr, so there is no visible scrollbar jumping
  document.querySelectorAll('.sidebar-navigation').forEach(section => {
    section.addEventListener(
      'scroll',
      function() {
        localStorage.setItem('menu.scroll.position.top', section.scrollTop);
      },
      false
    );
  });

  // add event listend for all clics to links, so we can scroll to the heading if it is part of a tab
  document
    .querySelectorAll('a[href*="#section"]:not(.copy-anchor)')
    .forEach(link => {
      link.addEventListener('click', function() {
        const href = this.getAttribute('href');
        const hash = href.split('#')[1];
        const foundElement = document.querySelector(`[id='${hash}']`);
        navigateToElement(foundElement);
      });
    });

  $('.nav-tabs-container').each(function() {
    var $container = $(this);
    var $tabsWrapper = $container.find('.nav-tabs-inline');
    var $leftArrow = $container.find('.scroll-arrow-left');
    var $rightArrow = $container.find('.scroll-arrow-right');

    function checkForScroll() {
      var scrollLeft = Math.floor($tabsWrapper.scrollLeft());
      var scrollWidth = Math.floor($tabsWrapper[0].scrollWidth);
      var clientWidth = Math.floor($tabsWrapper[0].clientWidth);

      if (scrollLeft > 0) {
        $leftArrow.css('display', 'flex');
      } else {
        $leftArrow.css('display', 'none');
      }

      if (scrollLeft < scrollWidth - clientWidth - 1) {
        // -1 because there is some issue with the scrollWidth
        $rightArrow.css('display', 'flex');
      } else {
        $rightArrow.css('display', 'none');
      }
    }

    function scrollTabs(direction) {
      var scrollAmount =
        direction === 'left' ? -$tabsWrapper.width() : $tabsWrapper.width();
      $tabsWrapper.animate(
        { scrollLeft: $tabsWrapper.scrollLeft() + scrollAmount },
        'smooth'
      );
    }

    $tabsWrapper.on('scroll', checkForScroll);

    $leftArrow.on('click', function() {
      scrollTabs('left');
    });

    $rightArrow.on('click', function() {
      scrollTabs('right');
    });

    checkForScroll(); // Initial check
  });
});

// Handle initial page load with hash
$(window).on('load', function() {
  let sections = [];

  if (window.location.hash) {
    setTimeout(() => {
      navigateToElement(window.location.hash);
    }, 250);
  }

  // Add preview banner in case the page is loaded in preview mode
  const isPreviewSite =
    window.location.host.indexOf('preview.supernova-docs.io') !== -1;
  if (isPreviewSite) {
    $('#header').prepend(
      '<div class="banner-preview"><div class="content"><div class="message"><svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><circle cx="12" cy="12" r="9"></circle><line x1="12" y1="8" x2="12.01" y2="8"></line><polyline points="11 12 12 12 12 16 13 16"></polyline></svg> <span>This website is a <b>private preview</b> of the changes made to your documentation.</span></div></div></div>'
    );
  }

  const contentNavContainer = document.querySelector('#content-nav');

  // Create intersection observer for all sections
  const observer = new IntersectionObserver(_entries => {
    // Highlight headers in viewport
    let isAnythingSelected = false;

    const findExistingSectionInOverview = section => {
      let id = section.getAttribute('id');
      let sectionElementInOverview = document.querySelector(
        `nav li a[href="#${id}"]`
      );

      if (sectionElementInOverview && sectionElementInOverview.parentElement) {
        return sectionElementInOverview.parentElement;
      }

      if (!['h3', 'h2'].includes(section.tagName.toLowerCase())) {
        return null;
      }
      const desiredHeadingLevels =
        section.tagName.toLowerCase() === 'h3' ? ['h2', 'h1'] : ['h1'];

      // when h3 headers are skipped, we need to highlight the parent h2 header
      let prevSection = null;
      let prevElement = section.previousElementSibling;
      let safetyIterationCounter = 0;
      while (prevElement && safetyIterationCounter < 250) {
        if (
          desiredHeadingLevels.includes(prevElement.tagName.toLowerCase()) &&
          sections.includes(prevElement)
        ) {
          prevSection = prevElement;

          break;
        }

        safetyIterationCounter++;
        prevElement = prevElement.previousElementSibling;
      }

      return prevSection && findExistingSectionInOverview(prevSection);
    };

    const overviewItemsToKeepActiveEvenIfNotInView = new Set();
    for (let section of sections) {
      if (isElementInViewport(section)) {
        isAnythingSelected = true;

        const overviewItem = findExistingSectionInOverview(section);
        overviewItemsToKeepActiveEvenIfNotInView.add(overviewItem);
        overviewItem && overviewItem.classList.add('active');

        // scrolling toc, not the whole page
        overviewItem &&
          contentNavContainer.scrollTo({
            top: overviewItem.offsetTop - 100
          });
      }
    }

    for (const section of sections) {
      const overviewItem = findExistingSectionInOverview(section);
      if (!overviewItemsToKeepActiveEvenIfNotInView.has(overviewItem)) {
        overviewItem && overviewItem.classList.remove('active');
      }
    }

    // If there are no headers in the viewport, then highlight the one which is closest to the viewport currently.
    if (!isAnythingSelected) {
      let minDistance = 9999999;
      let currentSection = undefined;
      for (let section of sections) {
        let distance = closestDistanceToViewportEdge(section);
        if (distance < minDistance) {
          minDistance = distance;
          currentSection = section;
        }
      }
      if (currentSection) {
        const overviewItem = findExistingSectionInOverview(currentSection);
        overviewItem && overviewItem.classList.add('active');
      }
    }
  });

  // Track all headers that have an `id` applied (only from the main content area, so we don't track headers from e.g. Tabs block. It breaks the ToC active items otherwise)
  document.querySelectorAll('#page-tab-content > h1[id]').forEach(section => {
    observer.observe(section);
    sections.push(section);
  });
  document.querySelectorAll('#page-tab-content > h2[id]').forEach(section => {
    observer.observe(section);
    sections.push(section);
  });
  document.querySelectorAll('#page-tab-content > h3[id]').forEach(section => {
    observer.observe(section);
    sections.push(section);
  });

  $('[data-action="copy-asset-content"]').on('click', function() {
    // Extract the SVG URL from the src attribute of the sibling <img> element
    const svgUrl = $(this)
      .closest('.asset-item')
      .find('img.asset-source')
      .attr('src');
    copySVGTextToClipboard(svgUrl);
  });
});

function isElementInViewport(el) {
  var rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

function closestDistanceToViewportEdge(el) {
  var rect = el.getBoundingClientRect();
  return Math.min(Math.abs(rect.top), Math.abs(rect.bottom));
}

/*-----------------------------
    Versions
------------------------------- */

function loadVersions(url) {
  // Disable versions before they are loaded
  let button = $('#version-container button');
  button.css('pointer-events', 'none');

  // Download JSON with version definitions for this particular design system (there is always one version file per design system at domain/version.json)
  $.getJSON(url, function(data) {
    // Get versions
    let versions = data.versions;

    // Load versions into the container and set active version
    let menu = $('#version-container .dropdown-menu');

    menu.html('');
    for (let v of versions) {
      // Make the version that fits the current deploy target URL to be the selected one
      let currentVersion = window.location.href.indexOf(v.url) !== -1;
      menu.append(
        `<a class="dropdown-item ${
          currentVersion ? 'checked' : ''
        }" href="https:${v.url}">${v.name}</a>`
      );
      if (currentVersion) {
        button.html(`${v.name}`);
      }
    }

    // Enable interaction with the menu
    button.css('pointer-events', '');
  }).fail(function() {
    // If we for some reason fail to download the versions or if the versions don't exist yet, just hide the button, so it doesn't confuse users
    button.hidden = true;
  });
}

/*-----------------------------
    Live sandbox manipulation
------------------------------- */

// Add listeners for actions
window.sandboxEngine.listener = function(message) {
  // Remove sandbox loaders when loaded correctly
  if (message.status === 'done' || message.status === 'error') {
    $(`.sandbox-loader-container[data-target="${message.sandboxId}"]`).remove();
  }
};

let trackedEditors = new Map();

// Load sandboxes that are present on the page
function loadSandboxes(url) {
  const asyncLoader = new Promise(resolve => {
    const engine = window.sandboxEngine;
    let targets = engine.getSandboxTargetsStartingWith('sandbox');
    if (targets && targets.length > 0) {
      // Build sandboxes
      engine.buildSandboxesSessionAuthorized(targets, url).then(() => {
        // Configure code mirror for all code targets on the page
        for (let target of targets) {
          const code = window.sandboxEngine.getCodeForSandboxId(target);
          const editorTarget = document.getElementById(
            `codepreview-editable-${target}`
          );
          // In some cases, editor target might not exist, for example if user used no code mode
          if (editorTarget) {
            const editor = CodeMirror.fromTextArea(editorTarget, {
              value: code,
              lineNumbers: true,
              mode: 'text/jsx',
              theme: 'supernova',
              styleActiveLine: { nonEmpty: true }
            });
            editor.getDoc().setValue(code);
            editor.setOption('theme', 'supernova');
            editor.on('change', editor => {
              let code = editor.doc.getValue();
              window.sandboxEngine.updateSandboxCode(target, code);
            });
            trackedEditors.set(target, editor);
          }
        }
      });
    }
  });
}

/*-----------------------------
    Download assets as ZIP
------------------------------- */
async function downloadAssets(assets, blockId) {
  const zip = new JSZip();
  const block = $(`[data-block-id="${blockId}"]`);
  const button = $(block).find('[data-action="download-assets"]');

  // Display the loading state
  $(button).prop('disabled', true);
  $(button)
    .find('.label')
    .addClass('hide');
  $(button)
    .find('.loading')
    .removeClass('hide')
    .find('.text')
    .text('Downloading... 0%');

  let processedFiles = 0;
  const totalFiles = Object.keys(assets).length;

  const addFileToZip = async (fileName, url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}. Status: ${response.status}`);
      }
      const blob = await response.blob();
      const fileExtension = url.split('.').pop();
      zip.file(`${fileName}.${fileExtension}`, blob);
      processedFiles++;
      if (processedFiles === Object.keys(assets).length) {
        $(button)
          .find('.loading .text')
          .text('Almost ready, zipping...');
      } else {
        let percentage = Math.round((processedFiles / totalFiles) * 100);
        $(button)
          .find('.loading .text')
          .text('Downloading... ' + percentage + '%');
      }
    } catch (error) {
      console.error(`Error adding file ${fileName} to zip.`, error);
    }
  };

  const downloadBatch = async batch => {
    for (const [fileName, url] of batch) {
      await addFileToZip(fileName, url);
    }
  };

  const chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  const processDownloads = async () => {
    const allFiles = Object.entries(assets);
    const batches = chunkArray(allFiles, 50); // Batch size set to 50
    for (const batch of batches) {
      await downloadBatch(batch);
    }
  };

  await processDownloads();

  zip
    .generateAsync({ type: 'blob' })
    .then(blob => {
      saveAs(blob, 'assets.zip');
      $(button)
        .find('.loading')
        .addClass('hide');
      $(button)
        .find('.label')
        .removeClass('hide');
      $(button).prop('disabled', false);
      $.toast({
        title: 'Download was successful',
        position: 'bottom'
      });
    })
    .catch(error => {
      console.error('Error generating zip file.', error);
      $.toast({
        title: 'There was an error creating the zip file. Please try again.',
        position: 'bottom'
      });
      $(button)
        .find('.loading')
        .addClass('hide');
      $(button)
        .find('.label')
        .removeClass('hide');
      $(button).prop('disabled', false);
      $.toast({
        title: 'Download failed',
        position: 'bottom'
      });
    });
}

/*-----------------------------
   Initialize Download button for all assets download
------------------------------- */
$('[data-action="download-assets"]').on('click', function() {
  // Fetch the `data-id` attribute from the clicked button
  const blockId = $(this).attr('data-from-block');
  // Fetch all `.asset-item` elements with a matching `data-block-id` and extract their image URLs
  const block = $(`[data-block-id="${blockId}"]`);
  const assets = {};

  block.find('.asset-item img').each(function() {
    const imgElement = $(this);
    const nameFromAlt = imgElement.attr('alt');
    const url = imgElement.attr('src');
    assets[nameFromAlt] = url;
  });

  // Call the `downloadAssets` function with the extracted URLs
  if (Object.keys(assets).length > 0) {
    downloadAssets(assets, blockId);
  } else {
    $.toast({
      title: 'Download failed',
      position: 'bottom'
    });
  }
});

/**
 * Download and rename a file
 */
async function downloadAndRenameFile(url, newName) {
  try {
    // Extract the file extension from the URL
    const fileExtension = url.split('.').pop();

    // Combine the new filename with the extracted extension
    const newFilename = `${newName}.${fileExtension}`;

    // Fetch the content of the file
    const response = await fetch(url);
    const blob = await response.blob();

    // Trigger the download with the new filename using saveAs function
    saveAs(blob, newFilename);

    $.toast({
      title: 'Download was successful',
      position: 'bottom'
    });
  } catch (error) {
    $.toast({
      title: 'Download failed',
      position: 'bottom'
    });
  }
}

/**
 * Download and overwrite a file name with a new one
 */
async function downloadAndOverwriteNameFile(url, newName) {
  try {
    // Fetch the content of the file
    const response = await fetch(url);
    const blob = await response.blob();

    // Trigger the download with the new filename using saveAs function
    saveAs(blob, newName);

    $.toast({
      title: 'Download was successful',
      position: 'bottom'
    });
  } catch (error) {
    $.toast({
      title: 'Download failed',
      position: 'bottom'
    });
  }
}

/*-----------------------------
   Initialize Download button for a single asset download
------------------------------- */
$('[data-action="download-asset"]').on('click', function() {
  const asset = $(this)
    .closest('.asset-item')
    .find('img.asset-source');
  const url = $(asset).attr('src');
  const name = asset.attr('alt');

  downloadAndRenameFile(url, name);
});

/*-----------------------------
   Initialize Download button for a single file download
------------------------------- */
$('[data-action="download-file"]').on('click', function() {
  const url = $(this).attr('data-file-url');
  const name = $(this).attr('data-file-name');

  downloadAndOverwriteNameFile(url, name);
});

/*-----------------------------
    Copy SVG assset to clipboard
------------------------------- */
async function copySVGTextToClipboard(svgURL) {
  try {
    // Fetch the SVG content from the URL
    let response = await fetch(svgURL);
    if (!response.ok) {
      $.toast({
        title: 'An error occured while copying SVG (this one)',
        position: 'bottom'
      });
      throw new Error('Network response was not ok');
    }

    let svgData = await response.text();

    // Copy the SVG content to the clipboard using navigator.clipboard API

    await navigator.clipboard.writeText(svgData);

    // Notify user
    $.toast({
      title: 'SVG copied to clipboard',
      position: 'bottom'
    });
  } catch (err) {
    console.error('Error:', err);
    $.toast({
      title: 'An error occured while copying SVG',
      position: 'bottom'
    });
  }
}

/*-----------------------------
    Tooltips
------------------------------- */

$(function() {
  $('[data-toggle="tooltip"]').tooltip();
  $('[data-toggle="popover"]').popover();
  $('[data-tooltip="tooltip"]').tooltip();
});

/*-----------------------------
    Search in lists
------------------------------- */
function searchInList(target, list) {
  var value = $(target)
    .val()
    .toLowerCase()
    .split(' ');
  // search for for multi-words search
  $(`#${list} .grid > .tile-item`).each(function() {
    matchWords(
      $(this)
        .attr('data-keywords')
        .toLowerCase(),
      value
    )
      ? $(this).removeClass('hidden')
      : $(this).addClass('hidden');
  });

  if ($(`#${list} .grid > .tile-item:not(.hidden)`).length === 0) {
    $(`#${list} .grid`).hide();
    $(`#${list} .empty-state`).show();
  } else {
    $(`#${list} .grid`).show();
    $(`#${list} .empty-state`).hide();
  }

  // Hide parent .grid if no visible tile items
  $(`#${list} .grid`).each(function() {
    if ($(this).find('.tile-item:not(.hidden)').length === 0) {
      $(this).hide();
    } else {
      $(this).show();
    }
  });
}

function matchWords(subject, words) {
  const hasText = words.every(word => subject.includes(word));

  return hasText;
}

/*-----------------------------
    Sandbox helpers
------------------------------- */

$('[data-toggle="copy-from-sandbox"]').click(function(event) {
  // Get code of the sandbox
  event.preventDefault();
  const sandboxId = $(this).attr('data-target');
  const code = window.sandboxEngine.getCodeForSandboxId(sandboxId);
  const cb = navigator.clipboard;
  cb.writeText(code);

  // Notify user
  $.toast({
    title: 'Component code copied to clipboard',
    position: 'bottom'
  });
});

$('[data-toggle="open-in-sandbox"]').click(async function(event) {
  // Get code of the sandbox
  event.preventDefault();
  const sandboxId = $(this).attr('data-target');
  await window.sandboxEngine.openInSandbox(sandboxId);
});

$('[data-toggle="reset-sandbox"]').click(async function(event) {
  // Reset sandbox code
  event.preventDefault();
  const sandboxId = $(this).attr('data-target');
  await window.sandboxEngine.resetSandboxToInitial(sandboxId);
  const code = window.sandboxEngine.getCodeForSandboxId(sandboxId);
  const editor = trackedEditors.get(sandboxId);
  if (editor) {
    editor.getDoc().setValue(code);
  }
});

/*-----------------------------
    Copy a link to heading
------------------------------- */

$('[data-copy-url="true"]').click(function(event) {
  // Get code of the sandbox
  event.preventDefault();
  const text = $(this).attr('href');
  const cb = navigator.clipboard;
  const pageURL = document.location.href.match(/(^[^#]*)/);
  const finalURL = pageURL[0] + text;
  cb.writeText(finalURL);

  // Notify user
  $.toast({
    title: 'URL to heading copied',
    position: 'bottom'
  });
});

/*-----------------------------
    Theme switching & mode preservation
------------------------------- */

$('.switch-theme').on('click', function(e) {
  // Toggle the dark / light mode when clicking the mode selector
  $('body').toggleClass('dark');
  e.preventDefault();

  // Store selection
  if ($('body').is('.dark')) {
    localStorage.setItem('sn.default.theme', 'dark');
  } else {
    localStorage.setItem('sn.default.theme', 'light');
  }
});

/*-----------------------------
    Read cookie
------------------------------- */
const getCookieValue = name =>
  document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')?.pop() || '';

/*-----------------------------
    Sidebar menu for mobile
------------------------------- */

$('#sidebarCollapse').on('click', function(e) {
  $('#side-navigation').toggleClass('nav-open');
  e.preventDefault();
});

$(document).on('click', '.nav-open .bg-sidebar', function(e) {
  $('#side-navigation').toggleClass('nav-open');
  e.preventDefault();
});

$('#mobile-menu-selector').on('click', function(e) {
  $('#side-navigation').removeClass('nav-open');
  e.preventDefault();
});

$('#versions-selector').on('click', function(e) {
  $('#side-navigation').removeClass('nav-open');
  e.preventDefault();
});

/*------------------------
   Component health status overlay
-------------------------- */

$(document).ready(function() {
  $('.content-block--component-health').on('click', function(e) {
    const blockId = $(this).data('block-id');
    // Toggle the overlay
    $('#overlay-' + blockId).toggleClass('d-none');
    e.preventDefault();
  });

  $('.health-overlay').on('click', function(e) {
    // Toggle the overlay
    $(this).toggleClass('d-none');
    e.preventDefault();
  });

  $('.health-overlay-content').on('click', function(e) {
    // Prevent closing the window
    e.stopPropagation();
  });
});
