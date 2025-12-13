# PDF Generation Production Fix

## Problem
PDF generation works locally but fails in production (Netlify deployment) with error: "Failed to generate PDF file. Please try again."

## Root Causes
Common issues with html2canvas in production:
1. **CORS Issues** - Images from external sources may fail to load
2. **Content Security Policy (CSP)** - Strict CSP headers may block canvas operations
3. **Image Loading Timeouts** - Production environments may have slower image loading
4. **Tainted Canvas** - `allowTaint: false` blocks canvases with cross-origin images

## Fixes Applied

### 1. Updated html2canvas Configuration
- Changed `allowTaint: true` - Allows tainted canvases (needed for cross-origin images)
- Increased image timeout from 2s to 5s - Better for production environments
- Added `imageTimeout: 15000` - 15 second timeout for html2canvas
- Added `foreignObjectRendering: false` - Better compatibility

### 2. Improved Error Handling
- Added detailed error logging with stack traces
- User-friendly error messages based on error type
- Better error categorization (canvas, timeout, CORS)

### 3. Enhanced Image Loading
- Increased image load timeout from 2s to 5s
- Added logging for image load success/failure
- Continue PDF generation even if some images fail

## Production Checklist

### 1. Check Browser Console
When PDF generation fails, check the browser console (F12) for:
- `❌ html2canvas error on page X`
- `⚠️ Image X failed to load`
- CORS errors
- Timeout errors

### 2. Verify Environment Variables
Ensure your production environment has:
```bash
VITE_API_URL=https://your-backend-url.com/api
```

### 3. Check Netlify Headers
If using Netlify, check `netlify.toml` or Netlify dashboard for CSP headers:
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
```

### 4. Verify Image Sources
Check if product images are loading correctly:
- Images should be accessible from production domain
- No CORS errors in network tab
- Images should load within 5 seconds

### 5. Test Steps
1. Open browser console (F12)
2. Try generating a PDF
3. Check for any errors in console
4. Check Network tab for failed image requests
5. Look for CORS errors

## Common Error Messages

### "Failed to render PDF pages"
- **Cause**: html2canvas failed to render a page
- **Solution**: Check console for specific error, verify images are loading

### "PDF generation timed out"
- **Cause**: Images took too long to load
- **Solution**: Check network connection, verify image sources are accessible

### "CORS error: Unable to load images"
- **Cause**: Images from different origin blocked by CORS
- **Solution**: Ensure images are served from same domain or have proper CORS headers

## Debugging in Production

### Enable Detailed Logging
The code now includes console logs:
- `📸 Found X images to load for PDF generation`
- `✅ Image X/Y loaded successfully`
- `⚠️ Image X/Y failed to load`
- `❌ html2canvas error on page X`

### Check Network Tab
1. Open DevTools → Network tab
2. Filter by "Img"
3. Try generating PDF
4. Check for failed image requests (red status)
5. Check response headers for CORS issues

## Additional Configuration

### If Images Still Fail to Load
1. Ensure all product images are in the `public/products/` folder
2. Verify images are included in the build
3. Check that image paths are relative (not absolute URLs)

### If CSP is Blocking
Add to `netlify.toml`:
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; img-src 'self' data: https: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' https:;"
```

## Next Steps
1. Deploy the updated code
2. Test PDF generation in production
3. Check browser console for detailed error messages
4. Share console errors if issue persists

