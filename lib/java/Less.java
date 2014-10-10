/*
 * @author Arthur Fiedler, artfiedler@gmail.com
 */
package org.lesscss;

import java.io.*;
import java.util.Date;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.mozilla.javascript.tools.shell.Global;

public class Less
{
    /**
     * Test this class
     */
    public static void main(String[] args)
    {
        long start = new Date().getTime();
        System.out.println(Compile(".class { width: (1 + 2); }","test.less","test.css","-compress"));
        System.out.println("took: " + (new Date().getTime() - start));
    }

    /**
     * Compile LessCSS to CSS
     * @param input LessCSS
     * @return CSS, or in case of error the original LESS file
     */
    public static String Compile(String input)
    {
        return new Less().compile(input, "input.less", "output.css");
    }
    /**
     * Compile LessCSS to CSS
     * @param input LessCSS
     * @param dummyInputName Dummy input filename passed to lessc-rhino-x.x.x.js
     * @param dummyOutputName Dummy output filename passed to lessc-rhino-x.x.x.js
     * @param arguments Any arguments supported by lessc-rhino-1.7.5.js
     * @return CSS, or in case of error the original LESS file
     */
    public static String Compile(String input, String dummyInputName, String dummyOutputName, String... arguments)
    {
        return new Less().compile(input, dummyInputName, dummyOutputName, arguments);
    }

    /**
     * Compile LessCSS to CSS
     * @param input LessCSS
     * @param dummyInputName Dummy input filename passed to lessc-rhino-x.x.x.js
     * @param dummyOutputName Dummy output filename passed to lessc-rhino-x.x.x.js
     * @param arguments Any arguments supported by lessc-rhino-x.x.x.js
     * @return CSS, or in case of error the original LESS file
     */
    public String compile(String input, String dummyInputName, String dummyOutputName, String... arguments)
    {
        Context cx = Context.enter();
        try {
            InputStream in;

            // Initialize the js environment
            Global global = new Global(cx);
            Scriptable scope = cx.initStandardObjects(global);

            // Place the LessCss script into the varInput variable
            ScriptableObject.putProperty(scope, "varInput", Context.javaToJS(input, scope));

            // Setup the options
            StringBuilder sb = new StringBuilder();
            sb.append("var varOutput;");
            sb.append("var arguments = ['");
            sb.append(dummyInputName);
            sb.append("','");
            sb.append(dummyOutputName);
            sb.append("','-varin','-varout'");
            // Add in the user defined additional options
            for(String arg: arguments) {
                sb.append(",'");
                sb.append(arg);
                sb.append('\'');
            }
            sb.append("];");
            Object result = cx.evaluateString(scope, sb.toString(), "setup", 1, null);

            // Reference the two LessCSS rhino libs that you placed into your META-INF folder
            in = getClass().getResourceAsStream("/META-INF/less-rhino-1.7.5.js");
            result = cx.evaluateReader(global, new InputStreamReader(in), "less-rhino-1.7.5.js", 1, null);

            in = getClass().getResourceAsStream("/META-INF/lessc-rhino-1.7.5.js");
            result = cx.evaluateReader(scope, new InputStreamReader(in), "lessc-rhino-1.7.5.js", 1, null);

            // Extract and return the varOuput variable containing the CSS
            return Context.toString(ScriptableObject.getProperty(scope, "varOutput"));
        }
        catch (Exception ex) {
            ex.printStackTrace();
            //throw ex;
            return input;
        }
        finally {
            // Exit from the context.
            Context.exit();
        }
    }
}
