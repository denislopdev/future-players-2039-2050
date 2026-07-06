(function () {
  var page = document.getElementById("pageRoot");
  if (!page) return;

  document.addEventListener("mousemove", function (e) {
    var x = ((e.clientX / window.innerWidth) * 100).toFixed(1) + "%";
    var y = ((e.clientY / window.innerHeight) * 100).toFixed(1) + "%";
    page.style.setProperty("--mesh-x", x);
    page.style.setProperty("--mesh-y", y);
  });
})();
