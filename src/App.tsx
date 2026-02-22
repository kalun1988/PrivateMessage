/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, ShieldAlert, Copy, Check, Info, Trash2, Lock, Unlock, Smartphone, Code } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Zero-width characters mapping
// 0 -> \u200B (Zero Width Space)
// Robust Zero-width characters mapping for Android/iOS compatibility
// \u200C (ZWNJ) and \u200D (ZWJ) are more likely to be preserved by clipboards
const ZW_ZERO = '\u200C';
const ZW_ONE = '\u200D';
const ZW_START = '\u2060'; // Word Joiner as start marker
const ZW_END = '\uFEFF';   // Zero Width No-Break Space as end marker

declare const CryptoJS: any;

const SHORTCUT_SCRIPT = `/**
 * iOS Shortcuts Steganography Script (Robust Edition)
 * Uses ZWNJ/ZWJ and Interleaving for Android/iOS compatibility.
 */
const input = args.shortcutParameter || "";
const ZW_ZERO = '\\u200C';
const ZW_ONE = '\\u200D';
const ZW_START = '\\u2060';
const ZW_END = '\\uFEFF';

const hasZW = input.includes(ZW_START);

if (!hasZW) {
  const secret = prompt("輸入秘密訊息：");
  const pin = prompt("輸入 4 位 PIN 碼：");
  if (!secret || !pin || pin.length !== 4) {
    alert("輸入無效");
    completion();
  } else {
    const encrypted = Array.from(secret).map((c, i) => 
      String.fromCharCode(c.charCodeAt(0) ^ pin.charCodeAt(i % 4))
    ).join('');
    const binary = Array.from(encrypted).map(c => 
      c.charCodeAt(0).toString(2).padStart(16, '0')
    ).join('');
    const zw = ZW_START + Array.from(binary).map(b => b === '0' ? ZW_ZERO : ZW_ONE).join('') + ZW_END;
    
    // Interleave: Insert ZW string into the cover text
    const result = input.length > 0 ? input[0] + zw + input.slice(1) : zw;
    completion(result);
  }
} else {
  const pin = prompt("輸入 4 位 PIN 碼：");
  const startIdx = input.indexOf(ZW_START);
  const endIdx = input.indexOf(ZW_END);
  if (startIdx === -1 || endIdx === -1) {
    alert("找不到完整訊息");
    completion();
  } else {
    const zwContent = input.substring(startIdx + 1, endIdx);
    const binary = Array.from(zwContent).map(z => z === ZW_ZERO ? '0' : '1').join('');
    let encrypted = "";
    for (let i = 0; i < binary.length; i += 16) {
      encrypted += String.fromCharCode(parseInt(binary.substr(i, 16), 2));
    }
    const decrypted = Array.from(encrypted).map((c, i) => 
      String.fromCharCode(c.charCodeAt(0) ^ pin.charCodeAt(i % 4))
    ).join('');
    alert("解密結果：\\n" + decrypted);
    completion(decrypted);
  }
}`;

export default function App() {
  const [activeTab, setActiveTab] = useState<'encrypt' | 'decrypt' | 'shortcuts'>('encrypt');
  const [secretMessage, setSecretMessage] = useState('');
  const [coverText, setCoverText] = useState('');
  const [encryptPin, setEncryptPin] = useState('');
  const [decryptPin, setDecryptPin] = useState('');
  const [inputText, setInputText] = useState('');
  const [resultText, setResultText] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // Convert string to binary string
  const textToBinary = (text: string) => {
    return Array.from(text)
      .map(char => char.charCodeAt(0).toString(2).padStart(16, '0'))
      .join('');
  };

  // Convert binary string to string
  const binaryToText = (binary: string) => {
    const chars = [];
    for (let i = 0; i < binary.length; i += 16) {
      const byte = binary.slice(i, i + 16);
      if (byte.length === 16) {
        chars.push(String.fromCharCode(parseInt(byte, 2)));
      }
    }
    return chars.join('');
  };

  // Encrypt: Secret + PIN + Cover -> Hidden Text
  const handleEncrypt = () => {
    if (!secretMessage) {
      setError('請輸入秘密訊息');
      return;
    }
    if (!coverText) {
      setError('請輸入掩護文字');
      return;
    }
    if (encryptPin.length !== 4 || !/^\d+$/.test(encryptPin)) {
      setError('請輸入 4 位數字 PIN 碼');
      return;
    }

    try {
      setError('');
      const encrypted = CryptoJS.AES.encrypt(secretMessage, encryptPin).toString();
      const binary = textToBinary(encrypted);
      const hiddenChars = ZW_START + Array.from(binary)
        .map(bit => (bit === '0' ? ZW_ZERO : ZW_ONE))
        .join('') + ZW_END;
      
      // Robust Interleaving: Insert the hidden string after the first character of cover text
      // This prevents "trim" functions from stripping it.
      const result = coverText.length > 0 
        ? coverText[0] + hiddenChars + coverText.slice(1)
        : hiddenChars;
        
      setResultText(result);
    } catch (e) {
      setError('加密過程發生錯誤');
    }
  };

  // Decrypt: Hidden Text + PIN -> Secret Message
  const handleDecrypt = () => {
    if (!inputText) {
      setError('請輸入待解析的文字');
      return;
    }
    if (decryptPin.length !== 4 || !/^\d+$/.test(decryptPin)) {
      setError('請輸入 4 位數字 PIN 碼');
      return;
    }

    setError('');
    
    // Extract using markers
    const startIdx = inputText.indexOf(ZW_START);
    const endIdx = inputText.indexOf(ZW_END);

    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
      setError('找不到完整或有效的隱藏訊息');
      setResultText('');
      return;
    }

    const zwContent = inputText.substring(startIdx + 1, endIdx);
    const binary = Array.from(zwContent)
      .filter(char => char === ZW_ZERO || char === ZW_ONE)
      .map(char => (char === ZW_ZERO ? '0' : '1'))
      .join('');
    
    if (binary.length === 0) {
      setError('隱藏訊息內容為空');
      return;
    }

    try {
      const encryptedText = binaryToText(binary);
      const bytes = CryptoJS.AES.decrypt(encryptedText, decryptPin);
      const originalText = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!originalText) {
        throw new Error('Wrong PIN');
      }
      
      setResultText(originalText);
    } catch (e) {
      setError('密碼錯誤，或訊息在傳輸中損壞');
      setResultText('');
    }
  };

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearAll = () => {
    setSecretMessage('');
    setCoverText('');
    setEncryptPin('');
    setDecryptPin('');
    setInputText('');
    setResultText('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#F5F5F0] p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="mb-12 text-center">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-[#141414] text-[#F5F5F0] rounded-full text-xs font-medium tracking-widest uppercase mb-4"
          >
            <Shield size={14} />
            Steganography Tool
          </motion.div>
          <h1 className="text-5xl font-serif italic tracking-tight mb-2">隱語</h1>
          <p className="text-sm text-[#141414]/60 uppercase tracking-widest">PIN-Protected Zero-Width Encryption</p>
        </header>

        {/* Tabs */}
        <div className="flex justify-center gap-4 mb-8">
          {[
            { id: 'encrypt', label: '加密', icon: Lock },
            { id: 'decrypt', label: '解密', icon: Unlock },
            { id: 'shortcuts', label: '快捷指令', icon: Smartphone },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                  ? 'bg-[#141414] text-[#F5F5F0] shadow-lg scale-105' 
                  : 'bg-white text-[#141414]/40 hover:bg-[#141414]/5'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Encryption Tab */}
          {activeTab === 'encrypt' && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-3xl border border-[#141414]/5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-serif italic flex items-center gap-2">
                  <Lock size={20} className="text-[#141414]/40" />
                  加密秘密訊息
                </h2>
                <button 
                  onClick={clearAll}
                  className="text-[#141414]/40 hover:text-red-500 transition-colors p-2"
                  title="清除所有內容"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#141414]/40 mb-2">秘密訊息 (Secret Message)</label>
                  <textarea
                    value={secretMessage}
                    onChange={(e) => setSecretMessage(e.target.value)}
                    placeholder="輸入你想隱藏的文字..."
                    className="w-full bg-[#F5F5F0] border-none rounded-2xl p-4 focus:ring-2 focus:ring-[#141414]/10 transition-all min-h-[100px] resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-[#141414]/40 mb-2">掩護文字 (Cover Text)</label>
                    <input
                      type="text"
                      value={coverText}
                      onChange={(e) => setCoverText(e.target.value)}
                      placeholder="例如：今天天氣真不錯"
                      className="w-full bg-[#F5F5F0] border-none rounded-2xl p-4 focus:ring-2 focus:ring-[#141414]/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-[#141414]/40 mb-2">4 位 PIN 碼</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={encryptPin}
                      onChange={(e) => setEncryptPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="0000"
                      className="w-full bg-[#F5F5F0] border-none rounded-2xl p-4 focus:ring-2 focus:ring-[#141414]/10 transition-all text-center tracking-[1em]"
                    />
                  </div>
                </div>

                <button
                  onClick={handleEncrypt}
                  className="w-full bg-[#141414] text-[#F5F5F0] py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-[#141414]/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  產生加密文字
                </button>
              </div>
            </motion.section>
          )}

          {/* Decryption Tab */}
          {activeTab === 'decrypt' && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-3xl border border-[#141414]/5 shadow-sm"
            >
              <h2 className="text-xl font-serif italic flex items-center gap-2 mb-6">
                <Unlock size={20} className="text-[#141414]/40" />
                解析秘密訊息
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#141414]/40 mb-2">輸入待解析文字 (Input Text)</label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="貼上含有隱藏訊息的文字..."
                    className="w-full bg-[#F5F5F0] border-none rounded-2xl p-4 focus:ring-2 focus:ring-[#141414]/10 transition-all min-h-[100px] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#141414]/40 mb-2">輸入 4 位 PIN 碼</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={decryptPin}
                    onChange={(e) => setDecryptPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="0000"
                    className="w-full bg-[#F5F5F0] border-none rounded-2xl p-4 focus:ring-2 focus:ring-[#141414]/10 transition-all text-center tracking-[1em]"
                  />
                </div>

                <button
                  onClick={handleDecrypt}
                  className="w-full border-2 border-[#141414] text-[#141414] py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-[#141414] hover:text-[#F5F5F0] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  解析秘密訊息
                </button>
              </div>
            </motion.section>
          )}

          {/* Shortcuts Tab */}
          {activeTab === 'shortcuts' && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-3xl border border-[#141414]/5 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-6">
                <Smartphone size={24} className="text-[#141414]/40" />
                <h2 className="text-xl font-serif italic">iOS 快捷指令整合</h2>
              </div>

              <div className="space-y-6">
                <div className="bg-[#141414]/5 p-6 rounded-2xl border border-[#141414]/5 text-sm leading-relaxed">
                  <p className="mb-4 font-bold">如何使用：</p>
                  <ol className="list-decimal list-inside space-y-2 text-[#141414]/70">
                    <li>在 iOS 快捷指令中新增「執行 JavaScript」動作。</li>
                    <li>將下方的代碼貼入腳本區域。</li>
                    <li>此腳本會自動偵測輸入文字：
                      <ul className="list-disc list-inside ml-4 mt-1 opacity-80">
                        <li>無隱形字元時 $\rightarrow$ 進入加密模式。</li>
                        <li>含隱形字元時 $\rightarrow$ 進入解密模式。</li>
                      </ul>
                    </li>
                  </ol>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[#141414]/40">JavaScript 代碼 (自給自足版)</label>
                    <button
                      onClick={() => handleCopy(SHORTCUT_SCRIPT)}
                      className="text-[10px] uppercase tracking-widest font-bold text-[#141414] hover:underline flex items-center gap-1"
                    >
                      {copied ? <Check size={10} /> : <Copy size={10} />}
                      {copied ? '已複製' : '點擊複製代碼'}
                    </button>
                  </div>
                  <div className="relative group">
                    <pre className="w-full bg-[#141414] text-[#F5F5F0] p-4 rounded-2xl text-[10px] font-mono overflow-x-auto max-h-[300px] scrollbar-hide">
                      {SHORTCUT_SCRIPT}
                    </pre>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141414] to-transparent opacity-20 pointer-events-none rounded-2xl" />
                  </div>
                </div>

                <div className="flex items-start gap-2 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <Info size={16} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-amber-800 leading-tight uppercase tracking-wider">
                    注意：快捷指令版使用 XOR 演算法以確保無需外部庫即可運行，與網頁版的 AES 加密不相容。
                  </p>
                </div>
              </div>
            </motion.section>
          )}

          {/* Result Section */}
          <AnimatePresence>
            {(resultText || error) && activeTab !== 'shortcuts' && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-[#141414] text-[#F5F5F0] p-8 rounded-3xl shadow-xl relative overflow-hidden"
              >
                {error ? (
                  <div className="flex items-center gap-3 text-red-400">
                    <ShieldAlert size={24} />
                    <p className="font-bold tracking-wide">{error}</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-50">輸出結果</h3>
                      <button
                        onClick={() => handleCopy(resultText)}
                        className="flex items-center gap-2 bg-[#F5F5F0]/10 hover:bg-[#F5F5F0]/20 px-4 py-2 rounded-xl transition-all text-xs font-bold uppercase tracking-widest"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? '已複製' : '一鍵複製'}
                      </button>
                    </div>
                    <div className="bg-[#F5F5F0]/5 p-6 rounded-2xl break-all font-mono text-sm leading-relaxed border border-white/5">
                      {resultText}
                    </div>
                    <div className="mt-4 flex items-start gap-2 opacity-40">
                      <Info size={14} className="mt-0.5 shrink-0" />
                      <p className="text-[10px] leading-tight uppercase tracking-wider">
                        提示：加密後的文字看起來與掩護文字無異，但其中隱藏了不可見的零寬度字元。
                      </p>
                    </div>
                  </>
                )}
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-[#141414]/30">
          <p className="text-[10px] uppercase tracking-[0.3em]">Privacy First • PIN-Protected Steganography • 2024</p>
        </footer>
      </div>
    </div>
  );
}
