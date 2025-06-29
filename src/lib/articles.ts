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
  limit, // [新增]
  documentId, // [新增]
} from 'firebase/firestore';
import { db } from './firebase';

// ... (既有的 Article, GetArticlesOptions 等型別定義保持不變)
export type ArticleStatus = 'draft' | 'published';

export interface Article extends DocumentData {
  id: string;
  title: string;
  content: string;
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

// ... (既有的 getPublishedArticles, getFilterOptions 等函式保持不變)
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
 * [新增] 獲取相關文章
 * @param currentArticle - 當前正在瀏覽的文章物件
 * @returns 回傳最多 3 篇相關文章的陣列
 */
export const getRelatedArticles = async (currentArticle: Article): Promise<Article[]> => {
    if (!currentArticle) return [];

    const articlesRef = collection(db, 'articles');
    let relatedArticles: Article[] = [];
    const foundIds = new Set<string>([currentArticle.id]);

    // 1. 優先找尋相同分類的文章
    if (currentArticle.category) {
        const categoryQuery = query(
            articlesRef,
            where('status', '==', 'published'),
            where('category', '==', currentArticle.category),
            where(documentId(), '!=', currentArticle.id),
            limit(3)
        );
        const categorySnapshot = await getDocs(categoryQuery);
        categorySnapshot.forEach(doc => {
            if (!foundIds.has(doc.id)) {
                relatedArticles.push({ id: doc.id, ...doc.data() } as Article);
                foundIds.add(doc.id);
            }
        });
    }

    // 2. 如果相同分類的文章不足 3 篇，再從標籤中尋找
    if (relatedArticles.length < 3 && currentArticle.tags && currentArticle.tags.length > 0) {
        const tagsQuery = query(
            articlesRef,
            where('status', '==', 'published'),
            where('tags', 'array-contains-any', currentArticle.tags),
            limit(5) // 多取幾篇以防重複
        );
        const tagsSnapshot = await getDocs(tagsQuery);
        tagsSnapshot.forEach(doc => {
            // 確保不超過3篇，且不重複
            if (relatedArticles.length < 3 && !foundIds.has(doc.id)) {
                relatedArticles.push({ id: doc.id, ...doc.data() } as Article);
                foundIds.add(doc.id);
            }
        });
    }
    
    return relatedArticles.slice(0, 3);
};


// ... (既有的 addArticle, updateArticle, deleteArticle 等函式保持不變)
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