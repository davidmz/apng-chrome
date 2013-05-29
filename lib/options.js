$(function() {
    var isOpera = /Opera/.test(navigator['vendor']);

    $(".browser-title").html(isOpera ? "Opera" : "Chrome");

    var selectsBlock = $("#work-mode-selects");
    selectsBlock.find("input").change(function() {
        if (this.checked) {
            $(this).parent().siblings().removeClass("selected").end().addClass("selected");
            $(".tab-div").hide();
            $("#" + this.value + "-list").show();
        }
    });

    var form = $("#settings-form")[0];

    var mode = localStorage["mode"];
    if (mode != "white") mode = "black";

    selectsBlock.find("input[value='" + mode + "']").attr("checked", "checked");
    selectsBlock.find("input:checked").change();

    form.elements.blackList.value = localStorage["blackList"] || "";
    form.elements.whiteList.value = localStorage["whiteList"] || "";

    $(form).submit(function() {
        localStorage["mode"] = selectsBlock.find("input:checked").val();
        localStorage["blackList"] = this.elements.blackList.value;
        localStorage["whiteList"] = this.elements.whiteList.value;
        window.close();
        return false;
    });
});
