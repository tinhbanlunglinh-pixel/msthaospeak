---
description: Hướng dẫn sửa lỗi API Key hết quota - cho phép retry sau khi đổi key mới
---

# API Key Quota Recovery Skill

## Vấn đề
Khi API Key hết quota (rate limit), app báo lỗi nhưng sau khi user nhập key mới, app vẫn không thể tiếp tục vì:
1. Chat/API session vẫn giữ key cũ
2. Không có cơ chế retry
3. Error state không được reset đúng cách

## Giải pháp (3 bước)

### Bước 1: Cập nhật hàm Save API Key

Khi lưu key mới, phải:
- Clear error state
- Reinitialize API session với key mới

```tsx
// Trong component App hoặc nơi quản lý API key
const handleSaveApiKey = (key: string, model?: string) => {
  // Lưu vào storage
  localStorage.setItem('api_key', key);
  if (model) localStorage.setItem('selected_model', model);
  
  setApiKey(key);
  setShowApiModal(false);
  
  // 🔑 QUAN TRỌNG: Nếu đang có lỗi, clear và reinitialize
  if (state.error) {
    setState(prev => ({ ...prev, error: null }));
    initializeChat(key, model); // Hàm init session với key mới
  }
};
```

### Bước 2: Thêm nút "Thử lại" trong Error UI

```tsx
// Trong phần hiển thị lỗi
{state.error && (
  <div className="error-box">
    <p>{state.error}</p>
    
    <div className="button-group">
      <button onClick={() => setShowApiModal(true)}>
        🔑 Đổi API Key
      </button>
      
      {/* 🔑 QUAN TRỌNG: Nút retry - chỉ hiện khi đang trong quá trình xử lý */}
      {state.step > INITIAL_STEP && (
        <button onClick={handleRetry} className="btn-retry">
          🔄 Thử lại
        </button>
      )}
    </div>
  </div>
)}
```

### Bước 3: Implement hàm Retry

```tsx
const handleRetry = useCallback(() => {
  // 1. Clear error
  setState(prev => ({ ...prev, error: null }));
  
  // 2. Reinitialize với key hiện tại
  initializeChat(apiKey, selectedModel);
  
  // 3. Tiếp tục từ bước đang dở (delay nhỏ để đảm bảo init xong)
  setTimeout(() => {
    continueFromCurrentStep(); // Hàm tiếp tục generation
  }, 100);
}, [apiKey, selectedModel]);
```

## Checklist triển khai

- [ ] Xác định hàm `initializeChat` hoặc tương đương
- [ ] Cập nhật `handleSaveApiKey` để clear error + reinit
- [ ] Thêm nút "Thử lại" trong error UI
- [ ] Implement logic retry với `setTimeout`
- [ ] Test: Gây lỗi quota → Đổi key → Bấm Thử lại → Verify app tiếp tục

## Ví dụ thực tế (từ SKKN PRO app)

```tsx
// File: App.tsx

// 1. Import hàm init
import { initializeGeminiChat } from './services/geminiService';

// 2. Cập nhật handleSaveApiKey
const handleSaveApiKey = (key: string, model: string) => {
  localStorage.setItem('gemini_api_key', key);
  setApiKey(key);
  setShowApiModal(false);
  
  if (state.error) {
    setState(prev => ({ ...prev, error: null }));
    initializeGeminiChat(key, model);
  }
};

// 3. Trong Error UI - thêm nút retry
{state.step > GenerationStep.INPUT_FORM && (
  <button
    onClick={() => {
      setState(prev => ({ ...prev, error: null }));
      initializeGeminiChat(apiKey, selectedModel);
      setTimeout(() => generateNextSection(), 100);
    }}
    className="px-4 py-2 bg-emerald-600 text-white rounded-lg"
  >
    <RefreshCw size={16} />
    Thử lại
  </button>
)}
```

## Áp dụng cho các loại API khác

Pattern này hoạt động với:
- Google Gemini API
- OpenAI API  
- Claude API
- Bất kỳ API nào có rate limiting

Chỉ cần thay đổi:
- Tên hàm `initializeChat` → `initializeOpenAI`, `initializeClaude`, etc.
- Key storage name
- Step/state enum tương ứng

## Tips bổ sung

1. **Exponential backoff**: Nếu retry vẫn lỗi, có thể thêm delay tăng dần
2. **Retry count limit**: Giới hạn số lần retry để tránh loop vô tận
3. **User feedback**: Hiển thị thông báo "Đang thử lại..." khi bấm retry
