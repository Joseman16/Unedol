document.addEventListener("DOMContentLoaded", function () {

    const main = document.querySelector("main");

    const items = main.querySelectorAll(".galeria-book-3d__item");

    const container = main.querySelector(".galeria-book-3d");


    function updateContainerState() {

        const anyOpen = Array.from(items).some((item) =>
            item.classList.contains("is-open")
        );

        if (anyOpen) {
            container.classList.add("book-open");
        } else {
            container.classList.remove("book-open");
        }

    }


    items.forEach((item) => {

        item.addEventListener("click", (e) => {

            e.stopPropagation();

            item.classList.toggle("is-open");

            updateContainerState();

        });

    });


    document.addEventListener("click", () => {

        items.forEach((item) => {

            item.classList.remove("is-open");

        });

        updateContainerState();

    });

});


/* Carrusel de imagenes */

let index = 0;
let slides = document.getElementsByClassName("slide");

function mostrarImagen(){

    for(let i = 0; i < slides.length; i++){
        slides[i].style.display = "none";
    }

    slides[index].style.display = "block";

    index++;

    if(index >= slides.length){
        index = 0;
    }

}

setInterval(mostrarImagen, 10000); // 10 segundos

mostrarImagen();
