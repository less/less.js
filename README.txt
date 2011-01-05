    
                               _)      
     __ `__ \   _ \  __|  __|   |  __| 
     |   |   |  __/\__ \\__ \   |\__ \ 
    _|  _|  _|\___|____/____/_) |____/ 
                            ___/       

    mess.js is an attempt to use less.js to
    compile cascadenik-formatted styles.

    it is inspired by but incompatible with 
    Cascadenik [1]. most importantly it deviates
    by

    1. Supporting JSON MML representations only
    2. Implementing composition of styles instead
       of overriding

    mess.js is based on less.js [2], a CSS compiler
    written by Alexis Sellier. It includes
    underscore.js [3].

    like less, mess.js provides a binary in bin/,
    named mess, although it is designed primarily
    for usage as a library.

    usage:

      messc map_file.json

    [1]: https://github.com/mapnik/Cascadenik
    [2]: https://github.com/cloudhead/less.js
    [3]: https://github.com/documentcloud/underscore/
