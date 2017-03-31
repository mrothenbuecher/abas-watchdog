(function() {

    var fs = require('fs');

    // liste aller sprachdateien
    var files = fs.readdirSync(settings.dir+'lang/');

    var loader = {};

    // sprach menü anhand der gefundenen locale bauen
    $.each(files, function(i, file) {
        var locale = file.replace("\.json", "");
        loader[locale] = process.cwd()+(settings.dir==""?"":"/"+settings.dir)+"/lang/"+file;

        var menu = '<li class="mdl-menu__item">'+
            '<label class="mdl-radio mdl-js-radio mdl-js-ripple-effect" for="lang-'+i+'">'+
            '<input type="radio" id="lang-'+i+'" class="mdl-radio__button" name="lang" value="'+locale+'" '+(locale == settings.lang?"checked":"")+'>'+
            '<span class="mdl-radio__label">'+locale+'</span>'+
          '</label>'+
        '</li>';

        $('#lang-menu').append(menu);
    });

    $.i18n({
        locale: settings.lang // abhängig von ausgewählter sprache machen
    }).load(loader).done(function() {
        console.log('lang init done!')
    });

    function init() {
        $('body').i18n();
    }

    $(document).ready(function() {
        init();
        $('input[name="lang"]').on("change", function() {
            $this = $(this);
            $.i18n({
                locale: $this.val()
            });
            init();

        });
    });
})();
