using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.IO;
using System.Text.RegularExpressions;
using Newtonsoft.Json;
using System.Management;

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

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern IntPtr SendMessage(IntPtr hWnd, UInt32 Msg, IntPtr wParam, IntPtr lParam);

        private const UInt32 WM_CLOSE = 0x0010;

        static void CloseWindow(IntPtr hwnd)
        {
            SendMessage(hwnd, WM_CLOSE, IntPtr.Zero, IntPtr.Zero);
        }

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

            if (processes.Length == 0) {
                Console.WriteLine("[]");
                return;
            }

            if (args.Length == 1 && args[0].ToLower() == "kill")
            {
                // alle Prozesse töten
                // abas-window-watcher.exe kill
                foreach (Process process in processes)
                {
                    process.Kill();
                }
            }
            if (args.Length == 2 && args[0].ToLower() == "kill")
            {
                // alle Prozesse außer ... töten
                // abas-window-watcher.exe kill ["abas Kommandoübersicht","Artikel",...]
                List<string> names = JsonConvert.DeserializeObject <List<string>>(args[1]);

                foreach (Process process in processes)
                {
                    IDictionary<IntPtr, Window> windows = GetOpenWindowsFromPID(process.Id);
                    foreach (var kvp in windows)
                    {
                        bool kill = true;

                        foreach (string name in names)
                        {
                            if (kvp.Value.Title.Contains(name))
                            {
                                kill = false;
                                break;
                            }
                        }

                        if (kill)
                        {
                            CloseWindow(kvp.Key);
                        }
                    }
                }

            }
            else
            {
                // singleton?
                bool singleton = (args.Length == 1 && args[0].ToLower() == "singleton");
                
                bool first = true;

                foreach (Process process in processes)
                {
                    // nicht der erste Prozess
                    // und singleton
                    if(!first && singleton)
                    {
                        // prozess entfernen
                        process.Kill();
                    }
                    // nur der erste Prozess wird aufgelistet
                    // TODO
                    if (first)
                    {
                        IDictionary<IntPtr, Window> windows = GetOpenWindowsFromPID(process.Id);
                        var x = windows.Select(kvp => new
                            {
                                windowtitle = kvp.Value.Title,
                                id = kvp.Value.ProcessId
                            });

                        Console.WriteLine(JsonConvert.SerializeObject(x));

                        first = false;
                    }
                }
            }
        }
    }
}
