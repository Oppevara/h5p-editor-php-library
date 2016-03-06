var H5PEditor = H5PEditor || {};

H5PEditor.ImageEditingPopup = (function ($, EventDispatcher) {
  var instanceCounter = 0;
  var scriptsLoaded = false;
  var editorPath = '../../sites/all/modules/h5p/modules/h5peditor/h5peditor/';

  /**
   * Popup for editing images
   *
   * @param {number} [ratio] Ratio that cropping must keep
   * @constructor
   */
  function ImageEditingPopup(ratio) {
    EventDispatcher.call(this);
    var self = this;
    var uniqueId = instanceCounter;
    var isShowing = false;
    var isReset = false;
    var topOffset = 0;
    var maxWidth;
    var maxHeight;

    /**
     * Create header button
     *
     * @param {string} coreString Must be specified in core translations
     * @param {string} className Unique button identifier that will be added to classname
     * @param {function} clickEvent OnClick function
     */
    var createButton = function (coreString, className, clickEvent) {
      var button = document.createElement('button');
      button.textContent = ns.t('core', coreString);
      button.className = 'h5p-editing-image-' + className + '-button';
      button.onclick = clickEvent;
      headerButtons.appendChild(button);
    };

    /**
     * Set max width and height for image editing tool
     */
    var setDarkroomDimensions = function () {
      // Set max dimensions
      var style = getComputedStyle(popup);
      maxWidth = popup.offsetWidth - parseInt(style.paddingLeft) - parseInt(style.paddingRight);

      // Only use 65% of screen height
      var maxScreenHeight = screen.height * 0.65;
      var editorHeight = background.offsetHeight;

      // Use smallest of screen height and editor height,
      // we don't want to overflow editor or screen
      maxHeight = maxScreenHeight < editorHeight ? maxScreenHeight : editorHeight;
    };

    /**
     * Load scripts dynamically
     */
    var loadScripts = function () {
      loadScript(editorPath + 'libs/fabric.js', function () {
        loadScript(editorPath + 'libs/darkroom.js', function () {
          createDarkroom();
          scriptsLoaded = true;
        });
      });
    };

    /**
     * Load a script dynamically
     *
     * @param {string} path Path to script
     * @param {function} [callback]
     */
    var loadScript = function (path, callback) {
      $.ajax({
        url: path,
        dataType: 'script',
        success: function () {
          if (callback) {
            callback();
          }
        },
        async: true
      });
    };

    /**
     * Grab canvas data and pass data to listeners.
     */
    var saveImage = function() {

      // Check if image has changed
      if (self.darkroom.transformations.length || isReset) {
        var newImage = self.darkroom.canvas.toDataURL();
        self.trigger('savedImage', newImage);
      }

      isReset = false;
    };

    /**
     * Create image editing tool from image.
     */
    var createDarkroom = function () {
      requestAnimationFrame(function () {
        setDarkroomDimensions();

        self.darkroom = new Darkroom('#h5p-editing-image-' + uniqueId, {
          initialize: function () {
            self.adjustPopupOffset();
            imageLoading.classList.add('hidden');
          },
          maxWidth: maxWidth,
          maxHeight: maxHeight,
          plugins: {
            crop: {
              ratio: ratio || null
            },
            save : false
          }
        });
      });
    };

    /**
     * Adjust popup offset.
     * Make sure it is centered on top of offset.
     *
     * @param {Object} [offset] Offset that popup should center on.
     * @param {number} [offset.top] Offset to top.
     */
    this.adjustPopupOffset = function (offset) {
      if (offset) {
        topOffset = offset.top;
      }

      var offsetCentered = topOffset - (popup.offsetHeight / 2);

      // Min offset is 0
      offsetCentered = offsetCentered > 0 ? offsetCentered : 0;
      popup.style.top = offsetCentered + 'px';
    };

    /**
     * Set new image in editing tool
     *
     * @param {string} imgSrc Source of new image
     */
    this.setImage = function (imgSrc) {
      // Set new image
      var darkroom = popup.querySelector('.darkroom-container');
      popup.removeChild(darkroom);

      editingImage.src = imgSrc;
      imageLoading.classList.remove('hidden');
      editingImage.classList.add('hidden');
      popup.appendChild(editingImage);

      createDarkroom();
    };

    /**
     * Show popup
     *
     * @param {Object} [offset] Offset that popup should center on.
     * @param {string} [imageSrc] Source of image that will be edited
     */
    this.show = function (offset, imageSrc) {
      if (imageSrc) {

        // Load image editing scripts dynamically
        if (!scriptsLoaded) {
          editingImage.src = imageSrc;
          loadScripts();
        }
        else {
          self.setImage(imageSrc);
        }
      }

      isShowing = true;
      background.classList.remove('hidden');
      this.adjustPopupOffset(offset);
    };

    /**
     * Hide popup
     */
    this.hide = function () {
      isShowing = false;
      background.classList.add('hidden');
    };

    /**
     * Toggle popup visibility
     */
    this.toggle = function () {
      if (isShowing) {
        this.hide();
      }
      else {
        this.show();
      }
    };

    // Create elements
    var background = document.createElement('div');
    background.className = 'h5p-editing-image-popup-background hidden';

    var popup = document.createElement('div');
    popup.className = 'h5p-editing-image-popup';
    background.appendChild(popup);

    var header = document.createElement('div');
    header.className = 'h5p-editing-image-header';
    popup.appendChild(header);

    var headerTitle = document.createElement('div');
    headerTitle.className = 'h5p-editing-image-header-title';
    headerTitle.textContent = 'Edit Image!';
    header.appendChild(headerTitle);

    var headerButtons = document.createElement('div');
    headerButtons.className = 'h5p-editing-image-header-buttons';
    header.appendChild(headerButtons);

    // Create header buttons
    createButton('resetToOriginalLabel', 'reset', function () {
      self.trigger('resetImage');
      isReset = true;
    });
    createButton('cancelLabel', 'cancel', function () {self.trigger('canceled')});
    createButton('saveLabel', 'save', function () {
      saveImage();
      self.hide();
    });

    var imageLoading = document.createElement('div');
    imageLoading.className = 'h5p-editing-image-loading';
    imageLoading.textContent = ns.t('core', 'loadingImageEditor');
    popup.appendChild(imageLoading);

    // Create editing image
    var editingImage = new Image();
    editingImage.className = 'h5p-editing-image hidden';
    editingImage.id = 'h5p-editing-image-' + uniqueId;
    popup.appendChild(editingImage);

    // Append to body
    H5P.$body.get(0).appendChild(background);

    // Close popup on background click
    background.onclick = function () {
      this.hide();
    }.bind(this);

    // Prevent closing popup
    popup.onclick = function (e) {
      e.stopPropagation();
    };

    // Make sure each ImageEditingPopup instance has a unique ID
    instanceCounter++;
  }

  ImageEditingPopup.prototype = Object.create(EventDispatcher.prototype);
  ImageEditingPopup.prototype.constructor = ImageEditingPopup;

  return ImageEditingPopup;

})(H5P.jQuery, H5P.EventDispatcher);
