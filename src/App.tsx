/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, ShieldAlert, Copy, Check, Info, Trash2, Lock, Unlock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Zero-width characters mapping
// 0 -> \u200B (Zero Width Space)
// 1 -> \u200C (Zero Width Non-Joiner)
const ZW_ZERO = '\u200B';
const ZW_ONE = '\u200C';

export default function App() {
  const [secretMessage, setSecretMessage] = useState('');
  const [coverText, setCoverText] = useState('');
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

  // Encrypt: Secret + Cover -> Hidden Text
  const handleEncrypt = () => {
    if (!secretMessage) {
      setError('請輸入秘密訊息');
      return;
    }
    if (!coverText) {
      setError('請輸入掩護文字');
      return;
    }

    setError('');
    const binary = textToBinary(secretMessage);
    const hiddenChars = Array.from(binary)
      .map(bit => (bit === '0' ? ZW_ZERO : ZW_ONE))
      .join('');
    
    // Insert hidden characters at the end of the cover text
    setResultText(coverText + hiddenChars);
  };

  // Decrypt: Hidden Text -> Secret Message
  const handleDecrypt = () => {
    if (!inputText) {
      setError('請輸入待解析的文字');
      return;
    }

    setError('');
    const regex = new RegExp(`[${ZW_ZERO}${ZW_ONE}]`, 'g');
    const matches = inputText.match(regex);

    if (!matches) {
      setError('找不到隱藏的秘密訊息');
      setResultText('');
      return;
    }

    const binary = matches
      .map(char => (char === ZW_ZERO ? '0' : '1'))
      .join('');
    
    try {
      const decoded = binaryToText(binary);
      setResultText(decoded);
    } catch (e) {
      setError('解析失敗，格式可能不正確');
      setResultText('');
    }
  };

  const handleCopy = () => {
    if (!resultText) return;
    navigator.clipboard.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearAll = () => {
    setSecretMessage('');
    setCoverText('');
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
          <p className="text-sm text-[#141414]/60 uppercase tracking-widest">Zero-Width Character Encryption</p>
        </header>

        <div className="grid grid-cols-1 gap-8">
          {/* Encryption Section */}
          <motion.section 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
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

              <button
                onClick={handleEncrypt}
                className="w-full bg-[#141414] text-[#F5F5F0] py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-[#141414]/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                產生加密文字
              </button>
            </div>
          </motion.section>

          {/* Decryption Section */}
          <motion.section 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
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

              <button
                onClick={handleDecrypt}
                className="w-full border-2 border-[#141414] text-[#141414] py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-[#141414] hover:text-[#F5F5F0] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                解析秘密訊息
              </button>
            </div>
          </motion.section>

          {/* Result Section */}
          <AnimatePresence>
            {(resultText || error) && (
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
                        onClick={handleCopy}
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
          <p className="text-[10px] uppercase tracking-[0.3em]">Privacy First • Zero-Width Steganography • 2024</p>
        </footer>
      </div>
    </div>
  );
}
