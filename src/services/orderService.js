import { databases, DATABASE_ID, ORDERS_COLLECTION_ID } from '../appwrite/config';
import { ID, Query } from 'appwrite';
import { playSendSound } from '../utils/SoundHelper';
import { uploadToImageKit } from './uploadService';
import { getMerchantsByType } from './merchantService';

export const ORDER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PICKUP: 'pickup',
  PREPARING: 'preparing',
  READY: 'ready',
  DRIVER_ASSIGNED: 'driver_assigned',
  ON_THE_WAY: 'on_the_way',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

export const PAYMENT_METHOD = {
  CASH_ON_DELIVERY: 'cash_on_delivery',
};

// ✅ إرسال إشعار للتجار عند طلب جديد
export const notifyNewOrder = async (orderData) => {
  try {
    console.log(`🔔 إرسال إشعار طلب جديد لخدمة: ${orderData.serviceType}`);
    
    const merchants = await getMerchantsByType(orderData.serviceType);
    
    if (merchants.success && merchants.data.length > 0) {
      console.log(`📢 تم إرسال إشعار لـ ${merchants.data.length} تاجر`);
      return { success: true, count: merchants.data.length };
    } else {
      console.log('⚠️ لا يوجد تجار لهذه الخدمة لإرسال الإشعار');
      return { success: false, error: 'لا يوجد تجار' };
    }
  } catch (error) {
    console.error('❌ خطأ في إرسال الإشعار:', error);
    return { success: false, error: error.message };
  }
};

export const createOrder = async (orderData) => {
  try {
    const allowedFields = [
      'customerName', 'customerPhone', 'customerAddress', 'serviceType', 'serviceName',
      'items', 'description', 'rawText', 'status', 'totalPrice',
      'deliveryFee', 'finalTotal', 'voiceUrl', 'imageUrls', 'notes',
      'merchantId', 'merchantName', 'merchantPhone', 'driverId',
      'driverName', 'driverPhone', 'createdAt', 'updatedAt', 'paymentMethod',
      'hasPickup', 'pickupAddress', 'orderDetails'
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
    cleanOrder.paymentMethod = cleanOrder.paymentMethod || PAYMENT_METHOD.CASH_ON_DELIVERY;
    cleanOrder.createdAt = cleanOrder.createdAt || new Date().toISOString();
    cleanOrder.updatedAt = cleanOrder.updatedAt || new Date().toISOString();

    if (cleanOrder.totalPrice) cleanOrder.totalPrice = Number(cleanOrder.totalPrice);
    if (cleanOrder.deliveryFee) cleanOrder.deliveryFee = Number(cleanOrder.deliveryFee);
    if (cleanOrder.finalTotal) cleanOrder.finalTotal = Number(cleanOrder.finalTotal);

    // ✅ إذا كان orderDetails string، نحوله لـ array
    if (orderData.orderDetails && typeof orderData.orderDetails === 'string') {
      try {
        cleanOrder.orderDetails = JSON.parse(orderData.orderDetails);
      } catch (e) {
        cleanOrder.orderDetails = [orderData.orderDetails];
      }
    }

    console.log('📦 إنشاء طلب جديد:', cleanOrder);

    const response = await databases.createDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      ID.unique(),
      cleanOrder
    );

    await playSendSound();
    await notifyNewOrder(cleanOrder);

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
    if (filters.notMerchantId) queries.push(Query.notEqual('merchantId', filters.notMerchantId));
    if (filters.notDriverId) queries.push(Query.notEqual('driverId', filters.notDriverId));
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

export const getMerchantOrders = async (merchantId) => getOrders({ merchantId });

export const acceptOrder = async (orderId, merchantId, merchantName, merchantPhone) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      orderId,
      {
        status: ORDER_STATUS.ACCEPTED,
        merchantId,
        merchantName,
        merchantPhone,
        acceptedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في قبول الطلب:', error);
    return { success: false, error: error.message };
  }
};

export const startPickup = async (orderId) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      orderId,
      {
        status: ORDER_STATUS.PICKUP,
        pickupStartedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في بدء الاستلام:', error);
    return { success: false, error: error.message };
  }
};

export const completePickup = async (orderId) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      orderId,
      {
        status: ORDER_STATUS.PREPARING,
        pickupCompletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في إكمال الاستلام:', error);
    return { success: false, error: error.message };
  }
};

export const updateOrderStatus = async (orderId, status, additionalData = {}) => {
  try {
    const updateData = {
      status,
      updatedAt: new Date().toISOString(),
      ...additionalData
    };

    if (status === ORDER_STATUS.PICKUP) {
      updateData.pickupStartedAt = new Date().toISOString();
    }

    if (status === ORDER_STATUS.DELIVERED) {
      updateData.deliveredAt = new Date().toISOString();
    }

    const response = await databases.updateDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      orderId,
      updateData
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في تحديث الطلب:', error);
    return { success: false, error: error.message };
  }
};

export const setOrderPrice = async (orderId, totalPrice, deliveryFee = 0) => {
  try {
    const finalTotal = totalPrice + deliveryFee;
    const response = await databases.updateDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      orderId,
      {
        status: ORDER_STATUS.READY,
        totalPrice: Number(totalPrice),
        deliveryFee: Number(deliveryFee),
        finalTotal: Number(finalTotal),
        priceSetAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في تحديد السعر:', error);
    return { success: false, error: error.message };
  }
};

export const assignDriver = async (orderId, driverId, driverName, driverPhone) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      orderId,
      {
        status: ORDER_STATUS.DRIVER_ASSIGNED,
        driverId,
        driverName,
        driverPhone,
        driverAssignedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في تعيين مندوب:', error);
    return { success: false, error: error.message };
  }
};

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
    console.error('❌ خطأ في بدء التوصيل:', error);
    return { success: false, error: error.message };
  }
};

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
    console.error('❌ خطأ في إكمال التوصيل:', error);
    return { success: false, error: error.message };
  }
};

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
    console.error('❌ خطأ في إلغاء الطلب:', error);
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
