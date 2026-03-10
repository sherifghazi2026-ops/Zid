import { databases, DATABASE_ID, ORDERS_COLLECTION_ID } from '../appwrite/config';
import { ID, Query } from 'appwrite';
import { playSendSound } from '../utils/SoundHelper';
import { uploadToImageKit as uploadFile } from './uploadService';

export const ORDER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  ON_THE_WAY: 'on_the_way',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

export const createOrder = async (orderData) => {
  try {
    // قائمة الحقول المسموح بها
    const allowedFields = [
      'customerPhone', 'customerAddress', 'serviceType', 'serviceName',
      'items', 'description', 'rawText', 'status', 'totalPrice',
      'deliveryFee', 'finalTotal', 'voiceUrl', 'imageUrls', 'notes',
      'merchantId', 'merchantName', 'merchantPhone', 'driverId',
      'driverName', 'driverPhone', 'createdAt', 'updatedAt'
    ];

    // بناء الكائن بالحقول المسموح بها فقط
    const cleanOrder = {};
    allowedFields.forEach(field => {
      if (orderData[field] !== undefined && orderData[field] !== null) {
        cleanOrder[field] = orderData[field];
      }
    });

    // التأكد من وجود الحقول المطلوبة
    cleanOrder.customerPhone = cleanOrder.customerPhone || orderData.customerPhone;
    cleanOrder.customerAddress = cleanOrder.customerAddress || orderData.customerAddress;
    cleanOrder.serviceType = cleanOrder.serviceType || orderData.serviceType;
    cleanOrder.serviceName = cleanOrder.serviceName || orderData.serviceName;
    cleanOrder.items = cleanOrder.items || orderData.items || [];
    cleanOrder.status = cleanOrder.status || ORDER_STATUS.PENDING;
    cleanOrder.merchantId = cleanOrder.merchantId || orderData.merchantId;
    cleanOrder.merchantName = cleanOrder.merchantName || orderData.merchantName;
    cleanOrder.merchantPhone = cleanOrder.merchantPhone || orderData.merchantPhone;
    cleanOrder.createdAt = cleanOrder.createdAt || new Date().toISOString();
    cleanOrder.updatedAt = cleanOrder.updatedAt || new Date().toISOString();

    // تحويل القيم الرقمية
    if (cleanOrder.totalPrice) cleanOrder.totalPrice = Number(cleanOrder.totalPrice);
    if (cleanOrder.deliveryFee) cleanOrder.deliveryFee = Number(cleanOrder.deliveryFee);
    if (cleanOrder.finalTotal) cleanOrder.finalTotal = Number(cleanOrder.finalTotal);

    console.log('📦 إرسال طلب نظيف:', cleanOrder);

    const response = await databases.createDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      ID.unique(),
      cleanOrder
    );

    await playSendSound();
    
    // هنا ممكن تبعت إشعار للتاجر (Notification)
    console.log(`🔔 إشعار للتاجر ${cleanOrder.merchantName}: طلب جديد`);
    
    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في إنشاء الطلب:', error);
    return { success: false, error: error.message };
  }
};

export const getOrders = async (filters = {}) => {
  try {
    const queries = [];
    
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        queries.push(Query.equal('status', filters.status));
      } else {
        queries.push(Query.equal('status', filters.status));
      }
    }
    
    if (filters.serviceType) {
      queries.push(Query.equal('serviceType', filters.serviceType));
    }
    
    if (filters.customerPhone) {
      queries.push(Query.equal('customerPhone', filters.customerPhone));
    }
    
    if (filters.merchantId) {
      queries.push(Query.equal('merchantId', filters.merchantId));
    }
    
    if (filters.driverId) {
      queries.push(Query.equal('driverId', filters.driverId));
    }
    
    queries.push(Query.orderDesc('createdAt'));
    
    const response = await databases.listDocuments(
      DATABASE_ID, 
      ORDERS_COLLECTION_ID, 
      queries
    );
    
    return { success: true, data: response.documents };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};

// جلب طلبات تاجر معين
export const getMerchantOrders = async (merchantId) => {
  return getOrders({ merchantId });
};

// قبول طلب
export const acceptOrder = async (orderId, merchantId) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      orderId,
      { 
        status: ORDER_STATUS.ACCEPTED,
        updatedAt: new Date().toISOString()
      }
    );
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// تحديث حالة الطلب
export const updateOrderStatus = async (orderId, status) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      orderId,
      { 
        status,
        updatedAt: new Date().toISOString()
      }
    );
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
