import { databases, DATABASE_ID, ORDERS_COLLECTION_ID, USERS_COLLECTION_ID } from '../appwrite/config';
import { ID, Query } from 'appwrite';
import { playSendSound } from '../utils/SoundHelper';
import { uploadToImageKit } from './uploadService';
import { notifyAllMerchants } from './notificationService';

export const ORDER_STATUS = {
  PENDING: 'pending',           // الطلب معلق (بانتظار تاجر)
  ACCEPTED: 'accepted',         // تم قبول الطلب من تاجر
  PREPARING: 'preparing',       // جاري التجهيز
  PRICE_SET: 'price_set',       // تم تحديد السعر (للخدمات بدون سعر مسبق)
  READY: 'ready',               // جاهز للاستلام
  ASSIGNING_DRIVER: 'assigning_driver', // في انتظار مندوب
  DRIVER_ASSIGNED: 'driver_assigned',   // تم تعيين مندوب
  ON_THE_WAY: 'on_the_way',     // المندوب في الطريق
  DELIVERED: 'delivered',       // تم التوصيل
  CANCELLED: 'cancelled',       // ملغي
};

// جلب جميع التجار المرتبطين بخدمة معينة
export const getMerchantsByServiceType = async (serviceType) => {
  try {
    console.log(`🔍 جلب التجار للخدمة: ${serviceType}`);
    
    const response = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [
        Query.equal('role', 'merchant'),
        Query.equal('merchantType', serviceType),
        Query.equal('active', true),
        Query.limit(100)
      ]
    );

    return { success: true, data: response.documents };
  } catch (error) {
    console.error('❌ خطأ في جلب التجار:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// جلب المندوبين المتاحين
export const getAvailableDrivers = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [
        Query.equal('role', 'driver'),
        Query.equal('active', true),
        Query.equal('isAvailable', true),
        Query.limit(50)
      ]
    );
    return { success: true, data: response.documents };
  } catch (error) {
    console.error('❌ خطأ في جلب المندوبين:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const createOrder = async (orderData) => {
  try {
    const allowedFields = [
      'customerPhone', 'customerAddress', 'serviceType', 'serviceName',
      'items', 'description', 'rawText', 'status', 'totalPrice',
      'deliveryFee', 'finalTotal', 'voiceUrl', 'imageUrls', 'notes',
      'merchantId', 'merchantName', 'merchantPhone', 'driverId',
      'driverName', 'driverPhone', 'createdAt', 'updatedAt'
    ];

    const cleanOrder = {};
    allowedFields.forEach(field => {
      if (orderData[field] !== undefined && orderData[field] !== null) {
        cleanOrder[field] = orderData[field];
      }
    });

    cleanOrder.customerPhone = cleanOrder.customerPhone || orderData.customerPhone;
    cleanOrder.customerAddress = cleanOrder.customerAddress || orderData.customerAddress;
    cleanOrder.serviceType = cleanOrder.serviceType || orderData.serviceType;
    cleanOrder.serviceName = cleanOrder.serviceName || orderData.serviceName;
    cleanOrder.items = cleanOrder.items || orderData.items || [];
    cleanOrder.status = cleanOrder.status || ORDER_STATUS.PENDING;
    cleanOrder.createdAt = cleanOrder.createdAt || new Date().toISOString();
    cleanOrder.updatedAt = cleanOrder.updatedAt || new Date().toISOString();

    if (cleanOrder.totalPrice) cleanOrder.totalPrice = Number(cleanOrder.totalPrice);
    if (cleanOrder.deliveryFee) cleanOrder.deliveryFee = Number(cleanOrder.deliveryFee);
    if (cleanOrder.finalTotal) cleanOrder.finalTotal = Number(cleanOrder.finalTotal);

    console.log('📦 إنشاء طلب جديد:', cleanOrder);

    const response = await databases.createDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      ID.unique(),
      cleanOrder
    );

    // للعميل: تشغيل صوت الإرسال
    await playSendSound();

    // إرسال إشعارات للتجار
    if (cleanOrder.serviceType) {
      await notifyAllMerchants(cleanOrder.serviceType, {
        $id: response.$id,
        customerPhone: cleanOrder.customerPhone,
        serviceType: cleanOrder.serviceType,
      });
    }

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
    if (filters.serviceType) queries.push(Query.equal('serviceType', filters.serviceType));
    if (filters.customerPhone) queries.push(Query.equal('customerPhone', filters.customerPhone));
    if (filters.merchantId) queries.push(Query.equal('merchantId', filters.merchantId));
    if (filters.driverId) queries.push(Query.equal('driverId', filters.driverId));
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

// قبول الطلب (للتاجر)
export const acceptOrder = async (orderId, merchantId, merchantName, merchantPhone) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      orderId,
      {
        status: ORDER_STATUS.ACCEPTED,
        merchantId, merchantName, merchantPhone,
        acceptedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// بدء التجهيز
export const startPreparing = async (orderId) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      orderId,
      {
        status: ORDER_STATUS.PREPARING,
        preparingStartedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// تحديد السعر (للخدمات بدون سعر مسبق)
export const setOrderPrice = async (orderId, totalPrice, deliveryFee = 0) => {
  try {
    const finalTotal = totalPrice + deliveryFee;
    const response = await databases.updateDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      orderId,
      {
        status: ORDER_STATUS.PRICE_SET,
        totalPrice: Number(totalPrice),
        deliveryFee: Number(deliveryFee),
        finalTotal: Number(finalTotal),
        priceSetAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// الطلب جاهز
export const markAsReady = async (orderId) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      orderId,
      {
        status: ORDER_STATUS.READY,
        readyAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// تعيين مندوب
export const assignDriver = async (orderId, driverId, driverName, driverPhone) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      orderId,
      {
        status: ORDER_STATUS.DRIVER_ASSIGNED,
        driverId, driverName, driverPhone,
        driverAssignedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// بدء التوصيل (للمندوب)
export const startDelivery = async (orderId) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      orderId,
      {
        status: ORDER_STATUS.ON_THE_WAY,
        deliveryStartedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// تأكيد التوصيل
export const completeDelivery = async (orderId) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      orderId,
      {
        status: ORDER_STATUS.DELIVERED,
        deliveredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// إلغاء الطلب
export const cancelOrder = async (orderId, reason = '') => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      orderId,
      {
        status: ORDER_STATUS.CANCELLED,
        cancellationReason: reason,
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// حذف طلب
export const deleteOrder = async (orderId) => {
  try {
    await databases.deleteDocument(DATABASE_ID, ORDERS_COLLECTION_ID, orderId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const uploadFile = async (uri, fileName, folderType) => {
  try {
    const result = await uploadToImageKit(uri, fileName, folderType);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
};
