import { useState, useEffect } from 'react'
import { Plus, Eye, Trash2, ShoppingCart, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import StatusBadge from '../components/StatusBadge'

const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [viewOrder, setViewOrder] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  // Create form state
  const [customerId, setCustomerId] = useState('')
  const [orderItems, setOrderItems] = useState([{ product_id: '', quantity: 1 }])
  const [submitting, setSubmitting] = useState(false)

  const fetchOrders = () =>
    api.get('/orders').then((r) => setOrders(r.data)).finally(() => setLoading(false))

  const fetchProducts = () => api.get('/products').then((r) => setProducts(r.data))

  useEffect(() => {
    fetchOrders()
    api.get('/customers').then((r) => setCustomers(r.data))
    fetchProducts()
  }, [])

  const getProduct = (id) => products.find((p) => p.id === parseInt(id))

  const orderTotal = orderItems.reduce((sum, item) => {
    const p = getProduct(item.product_id)
    if (!p || !item.quantity) return sum
    return sum + parseFloat(p.price) * parseInt(item.quantity || 0)
  }, 0)

  const openCreate = () => {
    setCustomerId('')
    setOrderItems([{ product_id: '', quantity: 1 }])
    setCreateOpen(true)
  }

  const addItem = () => setOrderItems((items) => [...items, { product_id: '', quantity: 1 }])

  const removeItem = (idx) =>
    setOrderItems((items) => items.filter((_, i) => i !== idx))

  const updateItem = (idx, field, value) =>
    setOrderItems((items) =>
      items.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    )

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!customerId) return toast.error('Please select a customer')
    if (orderItems.some((i) => !i.product_id || !i.quantity))
      return toast.error('Please fill in all item fields')

    setSubmitting(true)
    try {
      await api.post('/orders', {
        customer_id: parseInt(customerId),
        items: orderItems.map((i) => ({
          product_id: parseInt(i.product_id),
          quantity: parseInt(i.quantity),
        })),
      })
      toast.success('Order created successfully')
      setCreateOpen(false)
      fetchOrders()
      fetchProducts() // stock changed
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Error creating order')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusUpdate = async (orderId, status) => {
    try {
      const res = await api.patch(`/orders/${orderId}/status`, { status })
      setViewOrder(res.data)
      fetchOrders()
      fetchProducts() // stock may have been restored on cancel
      toast.success('Status updated')
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Error updating status')
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/orders/${deleteId}`)
      toast.success('Order deleted')
      setDeleteId(null)
      fetchOrders()
      fetchProducts()
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Error deleting order')
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <ShoppingCart className="text-gray-400" size={24} />
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <span className="text-sm text-gray-400">({orders.length})</span>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Create Order
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 text-left">Order ID</th>
                  <th className="px-6 py-3 text-left">Customer</th>
                  <th className="px-6 py-3 text-left">Items</th>
                  <th className="px-6 py-3 text-left">Total</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-gray-700">#{order.id}</td>
                    <td className="px-6 py-4 font-medium">{order.customer?.name ?? 'N/A'}</td>
                    <td className="px-6 py-4 text-gray-500">{order.items?.length ?? 0} item(s)</td>
                    <td className="px-6 py-4 font-medium">${parseFloat(order.total_amount).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      <button
                        onClick={() => setViewOrder(order)}
                        className="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50 transition-colors"
                        title="View details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteId(order.id)}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                      No orders yet. Click "Create Order" to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Order" maxWidth="max-w-xl">
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer <span className="text-red-500">*</span>
            </label>
            <select
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Select a customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">
                Items <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addItem}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                + Add item
              </button>
            </div>

            <div className="space-y-2">
              {orderItems.map((item, idx) => {
                const p = getProduct(item.product_id)
                return (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      required
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      value={item.product_id}
                      onChange={(e) => updateItem(idx, 'product_id', e.target.value)}
                    >
                      <option value="">Select product...</option>
                      {products.map((prod) => (
                        <option
                          key={prod.id}
                          value={prod.id}
                          disabled={prod.stock_quantity === 0}
                        >
                          {prod.name} — ${parseFloat(prod.price).toFixed(2)} (stock: {prod.stock_quantity})
                        </option>
                      ))}
                    </select>
                    <input
                      required
                      type="number"
                      min="1"
                      max={p?.stock_quantity ?? 9999}
                      className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                    />
                    {orderItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
            <span className="text-sm text-gray-600 font-medium">Order Total</span>
            <span className="text-lg font-bold text-gray-900">${orderTotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-end gap-3 pt-1 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View / Update Order Modal */}
      <Modal
        open={!!viewOrder}
        onClose={() => setViewOrder(null)}
        title={`Order #${viewOrder?.id}`}
        maxWidth="max-w-2xl"
      >
        {viewOrder && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex gap-2">
                <span className="text-gray-500 shrink-0">Customer:</span>
                <span className="font-medium">{viewOrder.customer?.name}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 shrink-0">Email:</span>
                <span>{viewOrder.customer?.email}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 shrink-0">Date:</span>
                <span>{new Date(viewOrder.created_at).toLocaleString()}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 shrink-0">Total:</span>
                <span className="font-bold">${parseFloat(viewOrder.total_amount).toFixed(2)}</span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Items</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-2 text-left">Product</th>
                      <th className="px-4 py-2 text-left">SKU</th>
                      <th className="px-4 py-2 text-right">Qty</th>
                      <th className="px-4 py-2 text-right">Unit Price</th>
                      <th className="px-4 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {viewOrder.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 font-medium">
                          {item.product?.name ?? `Product #${item.product_id}`}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {item.product?.sku ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">${parseFloat(item.unit_price).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          ${(parseFloat(item.unit_price) * item.quantity).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Update Status</label>
              <div className="flex items-center gap-3">
                <select
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  value={viewOrder.status}
                  onChange={(e) => handleStatusUpdate(viewOrder.id, e.target.value)}
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
                <StatusBadge status={viewOrder.status} />
              </div>
            </div>

            <div className="flex justify-end pt-1 border-t border-gray-100">
              <button
                onClick={() => setViewOrder(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Order"
        message="Are you sure you want to delete this order? Stock will be restored for non-delivered orders."
      />
    </div>
  )
}
