import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../lib/tables';
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

export const notifyNewOrder = async (orderData) => {
  try {
    console.log(`🔔 إرسال إشعار طلب جديد لخدمة: ${orderData.service_type}`);
    const merchants = await getMerchantsByType(orderData.service_type);
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
    const cleanOrder = {
      customer_name: orderData.customer_name || orderData.customerName,
      customer_phone: orderData.customer_phone || orderData.customerPhone || orderData.userPhone,
      customer_address: orderData.customer_address || orderData.customerAddress,
      service_type: orderData.service_type || orderData.serviceType,
      service_name: orderData.service_name || orderData.serviceName,
      items: orderData.items || [],
      description: orderData.description || '',
      raw_text: orderData.raw_text || orderData.rawText,
      status: orderData.status || ORDER_STATUS.PENDING,
      total_price: orderData.total_price ? Number(orderData.total_price) : (orderData.totalPrice ? Number(orderData.totalPrice) : null),
      subtotal: orderData.subtotal ? Number(orderData.subtotal) : null,
      delivery_fee: orderData.delivery_fee ? Number(orderData.delivery_fee) : (orderData.deliveryFee ? Number(orderData.deliveryFee) : 0),
      final_total: orderData.final_total ? Number(orderData.final_total) : (orderData.finalTotal ? Number(orderData.finalTotal) : null),
      notes: orderData.notes || '',
      voice_url: orderData.voice_url || orderData.voiceUrl,
      image_urls: orderData.image_urls || orderData.image_urls || [],
      merchant_id: orderData.merchant_id || (orderData.merchantId ? String(orderData.merchantId) : null),
      merchant_name: orderData.merchant_name || orderData.merchantName,
      merchant_place: orderData.merchant_place,
      merchant_phone: orderData.merchant_phone || orderData.merchantPhone,
      driver_id: orderData.driver_id || (orderData.driverId ? String(orderData.driverId) : null),
      driver_name: orderData.driver_name || orderData.driverName,
      driver_phone: orderData.driver_phone || orderData.driverPhone,
      payment_method: orderData.payment_method || orderData.paymentMethod || PAYMENT_METHOD.CASH_ON_DELIVERY,
      has_pickup: orderData.has_pickup || orderData.hasPickup || false,
      pickup_address: orderData.pickup_address || orderData.pickupAddress || '',
      pickup_fee: orderData.pickup_fee ? Number(orderData.pickup_fee) : (orderData.pickupFee ? Number(orderData.pickupFee) : 0),
      order_details: orderData.order_details || orderData.orderDetails || {},
      created_at: orderData.created_at || orderData.createdAt || new Date().toISOString(),
      updated_at: orderData.updated_at || orderData.updatedAt || new Date().toISOString(),
    };

    console.log('📦 إنشاء طلب جديد:', cleanOrder);

    const { data, error } = await supabase
      .from(TABLES.ORDERS)
      .insert([cleanOrder])
      .select()
      .single();

    if (error) throw error;

    await playSendSound();
    await notifyNewOrder(cleanOrder);

    return {
      success: true,
      data: {
        $id: data.id,
        id: data.id,
        ...data,
        created_at: data.created_at,
      }
    };
  } catch (error) {
    console.error('❌ خطأ في إنشاء الطلب:', error);
    return { success: false, error: error.message };
  }
};

export const getOrders = async (filters = {}) => {
  try {
    let query = supabase
      .from(TABLES.ORDERS)
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }
    if (filters.service_type) query = query.eq('service_type', filters.service_type);
    if (filters.customerPhone) query = query.eq('customer_phone', filters.customerPhone || filters.customer_phone);
    if (filters.merchantId) query = query.eq('merchant_id', String(filters.merchantId));
    if (filters.driverId) query = query.eq('driver_id', String(filters.driverId));
    if (filters.notMerchantId) query = query.neq('merchant_id', String(filters.notMerchantId));
    if (filters.notDriverId) query = query.neq('driver_id', String(filters.notDriverId));

    const { data, error } = await query;

    if (error) throw error;

    const formattedData = (data || []).map(item => ({
      $id: item.id,
      id: item.id,
      customer_name: item.customer_name,
      customer_phone: item.customer_phone,
      customer_address: item.customer_address,
      service_type: item.service_type,
      service_name: item.service_name,
      items: item.items,
      description: item.description,
      raw_text: item.raw_text,
      status: item.status,
      total_price: item.total_price,
      subtotal: item.subtotal,
      delivery_fee: item.delivery_fee,
      final_total: item.final_total,
      notes: item.notes,
      voice_url: item.voice_url,
      image_urls: item.image_urls,
      merchant_id: item.merchant_id,
      merchant_name: item.merchant_name,
      merchant_place: item.merchant_place,
      merchant_phone: item.merchant_phone,
      driver_id: item.driver_id,
      driver_name: item.driver_name,
      driver_phone: item.driver_phone,
      payment_method: item.payment_method,
      has_pickup: item.has_pickup,
      pickup_address: item.pickup_address,
      pickup_fee: item.pickup_fee,
      order_details: item.order_details,
      created_at: item.created_at,
      updated_at: item.updated_at,
      accepted_at: item.accepted_at,
      delivered_at: item.delivered_at,
      cancelled_at: item.cancelled_at,
      cancellation_reason: item.cancellation_reason,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('❌ خطأ في جلب الطلبات:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const getMerchantOrders = async (merchantId) => getOrders({ merchantId });

export const acceptOrder = async (orderId, merchantId, merchantName, merchantPhone) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ORDERS)
      .update({
        status: ORDER_STATUS.ACCEPTED,
        merchant_id: String(merchantId),
        merchant_name: merchantName,
        merchant_phone: merchantPhone,
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        $id: data.id,
        id: data.id,
        ...data,
        created_at: data.created_at,
      }
    };
  } catch (error) {
    console.error('❌ خطأ في قبول الطلب:', error);
    return { success: false, error: error.message };
  }
};

export const updateOrderStatus = async (orderId, status, additionalData = {}) => {
  try {
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
      ...additionalData
    };

    if (status === ORDER_STATUS.DELIVERED) {
      updateData.delivered_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from(TABLES.ORDERS)
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        $id: data.id,
        id: data.id,
        ...data,
        created_at: data.created_at,
      }
    };
  } catch (error) {
    console.error('❌ خطأ في تحديث الطلب:', error);
    return { success: false, error: error.message };
  }
};

export const setOrderPrice = async (orderId, totalPrice, deliveryFee = 0, pickupFee = 0) => {
  try {
    const finalTotal = totalPrice + deliveryFee + pickupFee;
    const { data, error } = await supabase
      .from(TABLES.ORDERS)
      .update({
        status: ORDER_STATUS.READY,
        total_price: Number(totalPrice),
        delivery_fee: Number(deliveryFee),
        pickup_fee: Number(pickupFee),
        final_total: Number(finalTotal),
        price_set_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        $id: data.id,
        id: data.id,
        ...data,
        created_at: data.created_at,
      }
    };
  } catch (error) {
    console.error('❌ خطأ في تحديد السعر:', error);
    return { success: false, error: error.message };
  }
};

export const assignDriver = async (orderId, driverId, driverName, driverPhone) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ORDERS)
      .update({
        status: ORDER_STATUS.DRIVER_ASSIGNED,
        driver_id: String(driverId),
        driver_name: driverName,
        driver_phone: driverPhone,
        driver_assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        $id: data.id,
        id: data.id,
        ...data,
        created_at: data.created_at,
      }
    };
  } catch (error) {
    console.error('❌ خطأ في تعيين مندوب:', error);
    return { success: false, error: error.message };
  }
};

export const startDelivery = async (orderId) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ORDERS)
      .update({
        status: ORDER_STATUS.ON_THE_WAY,
        delivery_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        $id: data.id,
        id: data.id,
        ...data,
        created_at: data.created_at,
      }
    };
  } catch (error) {
    console.error('❌ خطأ في بدء التوصيل:', error);
    return { success: false, error: error.message };
  }
};

export const completeDelivery = async (orderId) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ORDERS)
      .update({
        status: ORDER_STATUS.DELIVERED,
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        $id: data.id,
        id: data.id,
        ...data,
        created_at: data.created_at,
      }
    };
  } catch (error) {
    console.error('❌ خطأ في إكمال التوصيل:', error);
    return { success: false, error: error.message };
  }
};

export const cancelOrder = async (orderId, reason = '') => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ORDERS)
      .update({
        status: ORDER_STATUS.CANCELLED,
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        $id: data.id,
        id: data.id,
        ...data,
        created_at: data.created_at,
      }
    };
  } catch (error) {
    console.error('❌ خطأ في إلغاء الطلب:', error);
    return { success: false, error: error.message };
  }
};

export const deleteOrder = async (orderId) => {
  try {
    const { error } = await supabase
      .from(TABLES.ORDERS)
      .delete()
      .eq('id', orderId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('❌ خطأ في حذف الطلب:', error);
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
