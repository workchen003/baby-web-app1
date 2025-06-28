// src/lib/articles.ts
import { 
  collection, 
  doc, 
  addDoc, 
  serverTimestamp, 
  DocumentData,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

// 定義文章的狀態
export type ArticleStatus = 'draft' | 'published';

// 定義文章的資料結構介面
export interface Article extends DocumentData {
  id?: string; // Firestore document ID
  title: string;
  content: string; // HTML content from Tiptap
  category: string;
  tags: string[];
  coverImageUrl: string;
  status: ArticleStatus;
  authorId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * 新增一篇文章到 Firestore
 * @param articleData - 要儲存的文章資料物件
 */
export const addArticle = async (articleData: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const dataWithTimestamps = {
      ...articleData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'articles'), dataWithTimestamps);
    console.log('Article written with ID: ', docRef.id);
    return docRef;
  } catch (e) {
    console.error('Error adding article: ', e);
    throw new Error('Failed to add article.');
  }
};

// 後續我們會在這裡新增 getArticles, updateArticle, deleteArticle 等函式...