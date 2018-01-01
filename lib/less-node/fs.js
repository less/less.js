let fs;
export default fs;
try
{
    fs = require("graceful-fs");
}
catch (e)
{
    fs = require("fs");
}
