const button=document.querySelector(".btn1");
const toggleButton=document.querySelector(".toggle-button");
// const photo=document.querySelector("#img");
// const imgPreview = document.querySelector("#imgPreview");
// const previewText = document.querySelector("#previewText");

const images = [
    "../thesis_images/adam_andeve.jpg",
    "../thesis_images/madonna_contestabil.jpg",
    "../thesis_images/stgeorge.jpg",
    "../thesis_images/madonna-and-child.jpg",
    "../thesis_images/three_graces.jpg",
    "../thesis_images/temple.JPG",
    "../thesis_images/Incendio_di_borgo_01.jpg",
    "../thesis_images/vision-of-a-knight.jpg",
    "../thesis_images/galatea.jpg",
    "../thesis_images/school_athens.jpg"
  ];

document.addEventListener("DOMContentLoaded", () => {
  const imageGrid = document.querySelector(".image-grid");
  const expandedImageContainer = document.querySelector(".expanded-image-container");
  const expandedImage = document.querySelector(".expanded-image");
  const gridContainer=document.querySelector(".grid-container");
  const stepHeading=document.querySelector(".step2-heading");

  let cropper;

  // expandedImageContainer.style.display = "none";
  // expandedCoinsContainer.style.display = "none";

  images.forEach((imageUrl) => {
    const smallImageContainer = document.createElement("div");
    smallImageContainer.classList.add("small-image-container");
    imageGrid.appendChild(smallImageContainer);

    const imgElement = document.createElement("img");
    imgElement.src = imageUrl;
    imgElement.classList.add("small-image");
    smallImageContainer.appendChild(imgElement);

    imgElement.addEventListener("click", () => {
      // Display the expanded image container
      expandedImage.src = imageUrl;
      expandedImageContainer.style.display = "block";
      gridContainer.style.display="grid";
      gridContainer.style.maxWidth="1200px";
      stepHeading.style.display="block";


      // Initialize the Cropper instance with the expanded image
      expandedImage.onload= () => {
        if (cropper) {
          cropper.destroy();
        }
        cropper = new Cropper(expandedImage, {
          aspectRatio: 1, // Customize aspect ratio as needed
          viewMode: 1, // Set the view mode (0, 1, 2, 3)
          dragMode: 'move', // Set the drag mode (move, crop, none)
          responsive: true, // Enable responsive behavior
          autoCropArea: 0.8, // Set the initial cropped area size (0 to 1)
          crop: function (event) {
            // You can perform actions on crop events if needed
          },
        });
      };
    });
  });

  let coinsContainerMoved=false;

  async function searchForCoins() {
    if (cropper) {
      const data = cropper.getData();
      const croppedCanvas = cropper.getCroppedCanvas({
        width: data.width,
        height: data.height,
        minWidth: 100,
        minHeight: 100,
        maxWidth: 1000,
        maxHeight: 1000,
      });

      const croppedBlob = await new Promise((resolve) => {
        croppedCanvas.toBlob((blob) => {
          resolve(blob);
        }, "image/jpeg", 0.8);
      });

      const formData = new FormData();
      formData.append("croppedImage", croppedBlob, "cropped_image.jpg");

      try {
        const mainContainers = document.querySelector(".main-containers");
        const coinsContainer = document.querySelector(".coins-container");

        // Remove any previously created coins containers
        const previousCoinsContainers = document.querySelectorAll(".coin");
        previousCoinsContainers.forEach((container) => {
        container.remove();
        });

        if (!coinsContainerMoved) {
          // Move the coins container to the main containers' position in the DOM
          mainContainers.parentElement.insertBefore(coinsContainer, mainContainers.nextSibling);
          coinsContainerMoved = true;
        }

        // Apply animations
        mainContainers.style.transition = "transform 0.8s, opacity 0.5s";
        mainContainers.style.transform = "translateX(-100%)";
        mainContainers.style.opacity = "0";

        coinsContainer.style.transition = "transform 0.8s, opacity 0.5s"; // Apply transitions
        coinsContainer.style.transform = "translate(-50%, -50%)"; // Position it in the center
        coinsContainer.style.opacity = "1";

        toggleButton.style.transition = "transform 0.8s, opacity 0.8s";
        toggleButton.style.transform = "translate(-50%, -50%)";
        toggleButton.style.opacity = "1";

        const response = await fetch("/api", {
          method: "POST",
          body: formData,
        });

        console.log("Response from the backend:", response);
      } catch (error) {
        console.error("Error sending data to the backend:", error);
      }
    } else {
      console.error("Cropper not initialized or expandedImage src not set.");
    }
  }

  button.addEventListener("click", searchForCoins);


});
  toggleButton.addEventListener("click", () => {
    const mainContainers = document.querySelector(".main-containers");
    const coinsContainer = document.querySelector(".coins-container");

    coinsContainer.style.transition = "transform 0.5s, opacity 0.5s";
    coinsContainer.style.transform = "translateX(100%)";
    coinsContainer.style.opacity = "0";
    coinsContainer.style.display="none";

    mainContainers.style.transition = "transform 0.5s, opacity 0.5s";
    mainContainers.style.transform = "translateX(0)";
    mainContainers.style.opacity = "1";

    toggleButton.style.transition = "transform 0.5s, opacity 0.5s";
    toggleButton.style.transform = "translateX(100%)";
    toggleButton.style.opacity = "0";
    toggleButton.style.display="none";
  });



const socket = new WebSocket("ws://localhost:5002");

socket.addEventListener("open", (event) => {
  console.log("WebSocket connection established.");

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log("WebSocket message received:", message);

    if (message.type === "newCoins") {
      fetchCoinsFromServer();
    }
  };
});





async function fetchCoinsFromServer() {
  try {
    const response = await fetch("/api", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    console.log("Coins data received from server:", data);

    const coinsContainer=document.querySelector(".coins-container");
    coinsContainer.style.display="block";
    coinsContainer.innerHTML="";

    data.reverse().forEach((coin)=>{
      const coinElement=document.createElement("div");
      coinElement.style.marginBottom="30px"
      coinElement.classList.add("coin");

      //Decode base64
      const imgElement=document.createElement("img");
      imgElement.src="data:image/jpeg;base64,"+ coin.coin_file;
      coinElement.appendChild(imgElement);

      // Create elements for description and sim score
      const descriptionElement=document.createElement("p")
      descriptionElement.textContent="Description: "+ coin.description;
      coinElement.appendChild(descriptionElement);


      // Create a container for accuracy score and loading bar
      const accuracyContainer = document.createElement("div");
      accuracyContainer.classList.add("accuracy-container");
      accuracyContainer.style.display = "flex";
      accuracyContainer.style.alignItems = "center"; // Apply display: flex to the accuracy container
      coinElement.appendChild(accuracyContainer);

      const accuracyText = document.createElement("p");
      accuracyText.textContent = "Accuracy score:";
      accuracyContainer.appendChild(accuracyText);

      const loadingBarContainer = document.createElement("div");
      loadingBarContainer.classList.add("loading-bar-container");
      accuracyContainer.appendChild(loadingBarContainer);

      const loadingBar = document.createElement("div");
      loadingBar.classList.add("loading-bar");
      loadingBar.style.width = `${coin.sim_score * 100}%`; // Adjust the percentage as needed
      loadingBarContainer.appendChild(loadingBar);


      const srcElement= document.createElement("a");
      srcElement.textContent="Source: "+coin.name;
      srcElement.href="http://numismatics.org/collection/"+coin.name;
      srcElement.target="_blank";
      coinElement.appendChild(srcElement);

       if (coin.sim_score < 0.4) {
      coinElement.classList.add("low-score");
      }

      coinsContainer.appendChild(coinElement);
    });

    toggleButton.style.display="block";


  } catch (error) {
    console.log("Error fetching coins data:", error);
  }
};


