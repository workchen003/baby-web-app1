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

// 定义文章的資料結構介面
// [修正] 確保 createdAt 和 updatedAt 的型別為 Date
export interface Article extends DocumentData {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  coverImageUrl: string;
  status: ArticleStatus;
  authorId: string;
  createdAt: Date; // 型別應為 Date
  updatedAt: Date; // 型別應為 Date
}

// 篩選條件的介面
interface GetArticlesOptions {
  category?: string;
  tag?: string;
}

// 將 Firestore 文件轉換為 Article 物件的輔助函式
const docToArticle = (docSnap: DocumentData): Article => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      title: data.title,
      content: data.content,
      category: data.category,
      tags: data.tags,
      coverImageUrl: data.coverImageUrl,
      status: data.status,
      authorId: data.authorId,
      // [修正] 將 Timestamp 轉換為 Date
      createdAt: (data.createdAt as Timestamp)?.toDate(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate(),
    } as Article;
};


/**
 * 獲取所有「已發布」的文章，並可選擇性地進行篩選
 * @param options - 包含篩選條件的物件 (category 或 tag)
 * @returns 回傳包含符合條件文章的陣列
 */
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
  
  // [修正] 使用 docToArticle 進行轉換
  return querySnapshot.docs.map(doc => docToArticle(doc));
};


/**
 * 獲取所有文章中唯一的分類與標籤，用於篩選器
 * @returns 回傳一個包含所有分類和標籤的物件
 */
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
  const articlesQuery = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
  
  const querySnapshot = await getDocs(articlesQuery);
  
  return querySnapshot.docs.map(doc => docToArticle(doc));
};

/**
 * 根據 ID 獲取單一篇文章
 * @param id - 文章的 document ID
 * @returns 回傳文章物件，若找不到則回傳 null
 */
export const getArticleById = async (id: string): Promise<Article | null> => {
  const docRef = doc(db, 'articles', id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    // [修正] 使用輔助函式確保型別正確
    return docToArticle(docSnap);
  } else {
    console.warn(`Article with ID ${id} not found.`);
    return null;
  }
};


/**
 * 更新一篇文章
 * @param id - 要更新的文章 ID
 * @param data - 要更新的欄位資料
 */
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

/**
 * 刪除一篇文章
 * @param id - 要刪除的文章 ID
 */
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