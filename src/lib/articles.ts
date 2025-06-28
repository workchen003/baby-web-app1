// [修改] src/lib/articles.ts

import {
  collection,
  doc,
  addDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  DocumentData,
  Timestamp,
  getDoc,
  updateDoc,
  deleteDoc,
  where,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebase';

// 定義文章的狀態
export type ArticleStatus = 'draft' | 'published';

// 定義文章的資料結構介面
export interface Article extends DocumentData {
  id: string; // Firestore document ID
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

interface GetArticlesOptions {
  category?: string;
  tag?: string;
}

export const getPublishedArticles = async (options: GetArticlesOptions = {}): Promise<Article[]> => {
  const articlesRef = collection(db, 'articles');
  const constraints: QueryConstraint[] = [
    where('status', '==', 'published'),
    orderBy('createdAt', 'desc')
  ];

  if (options.category) {
    constraints.push(where('category', '==', options.category));
  }
  if (options.tag) {
    constraints.push(where('tags', 'array-contains', options.tag));
  }

  const articlesQuery = query(articlesRef, ...constraints);
  
  const querySnapshot = await getDocs(articlesQuery);
  
  return querySnapshot.docs.map(doc => {
    return {
      id: doc.id,
      ...doc.data()
    } as Article;
  });
};

export const getFilterOptions = async (): Promise<{ categories: string[], tags: string[] }> => {
    const articlesQuery = query(collection(db, 'articles'), where('status', '==', 'published'));
    const querySnapshot = await getDocs(articlesQuery);
    
    const categories = new Set<string>();
    const tags = new Set<string>();

    querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.category) {
            categories.add(data.category);
        }
        if (Array.isArray(data.tags)) {
            data.tags.forEach(tag => tags.add(tag));
        }
    });

    return {
        categories: Array.from(categories).sort(),
        tags: Array.from(tags).sort(),
    };
};

/**
 * [修改] 根據 ID 獲取單一篇文章
 * @param id - 文章的 document ID
 * @returns 回傳文章物件，若找不到則回傳 null
 */
export const getArticleById = async (id: string): Promise<Article | null> => {
  const docRef = doc(db, 'articles', id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    // [修正] 直接回傳 Firestore 的原始資料，不做 Timestamp 到 Date 的轉換。
    // 這樣可以確保回傳的物件符合 Article 介面的型別定義。
    return { id: docSnap.id, ...docSnap.data() } as Article;
  } else {
    console.warn(`Article with ID ${id} not found.`);
    return null;
  }
};

// --- 以下為既有函式，保持不變 ---

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

export const getArticles = async (): Promise<Article[]> => {
  const articlesQuery = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
  
  const querySnapshot = await getDocs(articlesQuery);
  
  return querySnapshot.docs.map(doc => {
    return {
      id: doc.id,
      ...doc.data()
    } as Article;
  });
};

export const updateArticle = async (id: string, data: Partial<Omit<Article, 'id' | 'createdAt'>>) => {
  const docRef = doc(db, 'articles', id);
  try {
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    console.log('Article updated with ID: ', id);
  } catch (e) {
    console.error('Error updating article: ', e);
    throw new Error('Failed to update article.');
  }
};

export const deleteArticle = async (id: string) => {
  const docRef = doc(db, 'articles', id);
  try {
    await deleteDoc(docRef);
    console.log('Article deleted with ID: ', id);
  } catch (e) {
    console.error('Error deleting article: ', e);
    throw new Error('Failed to delete article.');
  }
};