import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { IndexPosts } from './pages/IndexPosts'
import { CreatePost } from './pages/CreatePost'
import { ShowPost } from './pages/ShowPost'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/posts" element={<IndexPosts />} />
        <Route path="/posts/:id" element={<ShowPost />} />
        <Route path="/create" element={<CreatePost />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
