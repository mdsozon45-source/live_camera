document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('video');
  const mainCanvas = document.getElementById('main-canvas');
  const mainContext = mainCanvas.getContext('2d');

  const filterCanvases = {
    none: document.getElementById('filter-none').getContext('2d'),
    grayscale: document.getElementById('filter-grayscale').getContext('2d'),
    sepia: document.getElementById('filter-sepia').getContext('2d')
  };

  let currentFilter = 'none';

  Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('models'),
    faceapi.nets.faceExpressionNet.loadFromUri('models')
  ]).then(startVideo);


  function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        video.srcObject = stream;
        video.play();
      })
      .catch(err => {
        console.error("Error accessing the webcam: ", err);
      });
  }


  async function applyFilter() {
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      mainCanvas.width = video.videoWidth;
      mainCanvas.height = video.videoHeight;
      mainContext.drawImage(video, 0, 0, mainCanvas.width, mainCanvas.height);

      const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();

      detections.forEach(detection => {
        const { x, y, width, height } = detection.detection.box;
        const imageData = mainContext.getImageData(x, y, width, height);
        const data = imageData.data;

        switch (currentFilter) {
          case 'grayscale':
            applyGrayscaleFilter(data);
            break;
          case 'sepia':
            applySepiaFilter(data);
            break;
        }

        mainContext.putImageData(imageData, x, y);
      });
    }

    requestAnimationFrame(applyFilter);
  }

  async function drawFilterPreviews() {
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      Object.keys(filterCanvases).forEach(async filter => {
        const filterCanvas = filterCanvases[filter];
        filterCanvas.canvas.width = video.videoWidth;
        filterCanvas.canvas.height = video.videoHeight;
        filterCanvas.drawImage(video, 0, 0, filterCanvas.canvas.width, filterCanvas.canvas.height);

        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();

        detections.forEach(detection => {
          const { x, y, width, height } = detection.detection.box;
          const faceImageData = filterCanvas.getImageData(x, y, width, height);
          const faceData = faceImageData.data;

          switch (filter) {
            case 'grayscale':
              applyGrayscaleFilter(faceData);
              break;
            case 'sepia':
              applySepiaFilter(faceData);
              break;
          }

          filterCanvas.putImageData(faceImageData, x, y);
        });
      });
    }

    requestAnimationFrame(drawFilterPreviews);
  }

  function applyGrayscaleFilter(data) {
    for (let i = 0; i < data.length; i += 4) {
      const red = data[i];
      const green = data[i + 1];
      const blue = data[i + 2];
      const grayscale = (red + green + blue) / 3;
      data[i] = grayscale;
      data[i + 1] = grayscale;
      data[i + 2] = grayscale;
    }
  }

  function applySepiaFilter(data) {
    for (let i = 0; i < data.length; i += 4) {
      const red = data[i];
      const green = data[i + 1];
      const blue = data[i + 2];
      data[i] = (red * .393) + (green * .769) + (blue * .189);
      data[i + 1] = (red * .349) + (green * .686) + (blue * .168);
      data[i + 2] = (red * .272) + (green * .534) + (blue * .131);
    }
  }

  const filterOptions = document.querySelectorAll('.filter-option');
  filterOptions.forEach(option => {
    option.addEventListener('click', () => {
      filterOptions.forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
      currentFilter = option.getAttribute('data-filter');
    });
  });

  video.addEventListener('play', () => {
    applyFilter();
    drawFilterPreviews();
  });
});
