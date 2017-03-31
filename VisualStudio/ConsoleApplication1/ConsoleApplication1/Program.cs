using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.IO;
using System.Text.RegularExpressions;

namespace AbasWindowWatcher
{
    class Program
    {

        class Window{
            public string Title { get; set; }
            public long ProcessId { get; set; }
        }

        private delegate bool EnumWindowsProc(IntPtr hWnd, int lParam);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("USER32.DLL")]
        private static extern bool EnumWindows(EnumWindowsProc enumFunc, int lParam);

        [DllImport("USER32.DLL")]
        private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("USER32.DLL")]
        private static extern int GetWindowTextLength(IntPtr hWnd);

        [DllImport("USER32.DLL")]
        private static extern bool IsWindowVisible(IntPtr hWnd);

        [DllImport("USER32.DLL")]
        private static extern IntPtr GetShellWindow();

        static IDictionary<IntPtr, Window> GetOpenWindowsFromPID(int processID)
        {
            IntPtr hShellWindow = GetShellWindow();
            Dictionary<IntPtr, Window> dictWindows = new Dictionary<IntPtr, Window>();

            EnumWindows(delegate (IntPtr hWnd, int lParam)
            {
                if (hWnd == hShellWindow) return true;
                if (!IsWindowVisible(hWnd)) return true;

                int length = GetWindowTextLength(hWnd);
                if (length == 0) return true;

                uint windowPid;
                GetWindowThreadProcessId(hWnd, out windowPid);
                if (windowPid != processID) return true;

                StringBuilder stringBuilder = new StringBuilder(length);

                GetWindowText(hWnd, stringBuilder, length + 1);

                Window w = new Window();
                w.Title = stringBuilder.ToString();
                w.ProcessId = (long)hWnd;

                dictWindows.Add(hWnd, w);
                return true;
            }, 0);

            return dictWindows;
        }

        static void Main(string[] args)
        {
            Console.OutputEncoding = System.Text.Encoding.UTF8;
            Process[] processes = Process.GetProcessesByName("wineks");

            if (args.Length == 1 && args[0].ToLower() == "kill")
            {
                foreach (Process process in processes)
                {
                    process.Kill();
                }
            }
            else
            {

                Console.Write("[");
                foreach (Process process in processes)
                {
                    IDictionary<IntPtr, Window> windows = GetOpenWindowsFromPID(process.Id);

                    bool first = true;
                    foreach (KeyValuePair<IntPtr, Window> kvp in windows)
                    {
                        String title = kvp.Value.Title;

                        title = Regex.Replace(title, "(\")", "\\\"", RegexOptions.IgnoreCase);

                        title = "{\"windowtitle\":\"" + title + "\", \"id\":" + kvp.Value.ProcessId + "}";

                        if (first)
                        {
                            Console.Write("{0}", title);
                            first = false;
                        }
                        else
                        {
                            Console.Write(",{0}", title);
                        }
                    }
                }
                Console.Write("]");
            }
        }
    }
}
