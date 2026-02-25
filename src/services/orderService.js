import { databases, DATABASE_ID, ORDERS_COLLECTION_ID } from '../appwrite/config';
import { ID, Query } from 'appwrite';
import * as FileSystem from 'expo-file-system';

export const SERVICE_TYPES = {
  GROCERY: 'supermarket',
  RESTAURANT: 'restaurant',
  PHARMACY: 'pharmacy',
  IRONING: 'ironing',
  KITCHEN: 'kitchen',
  WINCH: 'winch',
  ELECTRICIAN: 'electrician',
  MOVING: 'moving',
  MARBLE: 'marble',
  PLUMBING: 'plumbing',
  CARPENTRY: 'carpentry',
};

export const ORDER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  ON_THE_WAY: 'on_the_way',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

// إنشاء طلب جديد
export const createOrder = async (orderData) => {
  try {
    console.log('📝 إنشاء طلب جديد:', orderData.serviceName);
    
    const order = {
      customerPhone: orderData.customerPhone,
      customerAddress: orderData.customerAddress,
      serviceType: orderData.serviceType,
      serviceName: orderData.serviceName,
      items: orderData.items || [],
      description: orderData.description || '',
      rawText: orderData.rawText || '',
      status: ORDER_STATUS.PENDING,
      paymentMethod: orderData.paymentMethod || 'cash',
      totalPrice: orderData.totalPrice || 0,
      deliveryFee: orderData.deliveryFee || 0,
      finalTotal: (orderData.totalPrice || 0) + (orderData.deliveryFee || 0),
      voiceFileId: orderData.voiceFileId || null,
      imageFileIds: orderData.imageFileIds || [],
      notes: orderData.notes || '',
      merchantId: null,
      merchantName: null,
      merchantPhone: null,
      driverId: null,
      driverName: null,
      driverPhone: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const response = await databases.createDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      ID.unique(),
      order
    );

    console.log('✅ تم إنشاء الطلب:', response.$id);
    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في إنشاء الطلب:', error);
    return { success: false, error: error.message };
  }
};

// جلب الطلبات حسب الفلاتر
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
    console.error('Error fetching orders:', error);
    return { success: false, error: error.message };
  }
};

// تحديث حالة الطلب
export const updateOrderStatus = async (orderId, status, additionalData = {}) => {
  try {
    const updateData = {
      status,
      updatedAt: new Date().toISOString(),
      ...additionalData
    };

    const response = await databases.updateDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      orderId,
      updateData
    );

    return { success: true, data: response };
  } catch (error) {
    console.error('Error updating order:', error);
    return { success: false, error: error.message };
  }
};

// قبول الطلب من قبل التاجر
export const acceptOrder = async (orderId, merchantId, merchantName, merchantPhone) => {
  return updateOrderStatus(orderId, ORDER_STATUS.ACCEPTED, {
    merchantId,
    merchantName,
    merchantPhone,
    acceptedAt: new Date().toISOString()
  });
};

// تحديد السعر
export const setOrderPrice = async (orderId, totalPrice, deliveryFee = 0) => {
  return updateOrderStatus(orderId, ORDER_STATUS.ACCEPTED, {
    totalPrice,
    deliveryFee,
    finalTotal: totalPrice + deliveryFee,
    priceSetAt: new Date().toISOString()
  });
};

// تعيين مندوب
export const assignDriver = async (orderId, driverId, driverName, driverPhone) => {
  return updateOrderStatus(orderId, ORDER_STATUS.PREPARING, {
    driverId,
    driverName,
    driverPhone,
    assignedAt: new Date().toISOString()
  });
};

// بدء التوصيل
export const startDelivery = async (orderId) => {
  return updateOrderStatus(orderId, ORDER_STATUS.ON_THE_WAY);
};

// تأكيد التسليم
export const completeDelivery = async (orderId) => {
  return updateOrderStatus(orderId, ORDER_STATUS.DELIVERED, {
    deliveredAt: new Date().toISOString()
  });
};

// إلغاء الطلب
export const cancelOrder = async (orderId, reason) => {
  return updateOrderStatus(orderId, ORDER_STATUS.CANCELLED, { 
    cancellationReason: reason 
  });
};

// حذف طلب (للأدمن فقط)
export const deleteOrder = async (orderId) => {
  try {
    await databases.deleteDocument(DATABASE_ID, ORDERS_COLLECTION_ID, orderId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// رفع ملف (نسخة مبسطة)
export const uploadFile = async (uri, fileName) => {
  try {
    console.log('📤 بدء رفع الملف:', fileName);
    return { success: true, fileId: 'file_' + Date.now() };
  } catch (error) {
    console.error('❌ فشل رفع الملف:', error);
    return { success: false, error: error.message };
  }
};
