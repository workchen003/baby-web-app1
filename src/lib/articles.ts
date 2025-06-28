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
  deleteDoc
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
  
  return querySnapshot.docs.map(doc => {
    return {
      id: doc.id,
      ...doc.data()
    } as Article;
  });
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
    return { id: docSnap.id, ...docSnap.data() } as Article;
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