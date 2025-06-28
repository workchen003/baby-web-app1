// src/lib/articles.ts
import { 
  collection, 
  doc, 
  addDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp, 
  DocumentData,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

// 定義文章的狀態
export type ArticleStatus = 'draft' | 'published';

// 定義文章的資料結構介面
export interface Article extends DocumentData {
  id: string; // 在讀取時，我們會把 document ID 放進來
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

/**
 * 獲取所有文章
 * @returns 回傳包含所有文章的陣列
 */
export const getArticles = async (): Promise<Article[]> => {
  // 建立一個查詢，指向 articles 集合，並依照 createdAt 欄位做降冪排序 (最新的在最前面)
  const articlesQuery = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
  
  const querySnapshot = await getDocs(articlesQuery);
  
  // 將查詢結果的每個文件，轉換成我們定義的 Article 型別
  return querySnapshot.docs.map(doc => {
    return {
      id: doc.id, // 將文件 ID 加入到物件中
      ...doc.data()
    } as Article;
  });
};

// 後續我們會在這裡新增 updateArticle, deleteArticle 等函式...