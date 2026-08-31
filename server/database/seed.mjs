import mysql from 'mysql2/promise'
import { randomBytes, scrypt as scryptCallback } from 'node:crypto'
import { promisify } from 'node:util'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('Thiếu DATABASE_URL. Hãy cấu hình file .env trước khi chạy seed.')

const pool = mysql.createPool({ uri: databaseUrl, connectionLimit: 2, enableKeepAlive: true, timezone: 'Z' })
const connection = await pool.getConnection()
const scrypt = promisify(scryptCallback)
const generatedCredentials = []

const dateInBangkok = (offsetDays = 0) => {
  const date = new Date(Date.now() + offsetDays * 86_400_000)
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date).map(part => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}
const atBangkok = (date, time) => new Date(`${date}T${time}:00+07:00`)

async function upsert(sql, values) {
  const [result] = await connection.execute(sql, values)
  return Number(result.insertId)
}

async function findId(table, field, value) {
  const allowed = new Set(['branches:code', 'customers:phone', 'employees:code', 'roles:code', 'services:code'])
  if (!allowed.has(`${table}:${field}`)) throw new Error('Truy vấn seed không hợp lệ.')
  const [rows] = await connection.execute(`SELECT id FROM \`${table}\` WHERE \`${field}\` = ? LIMIT 1`, [value])
  return Number(rows[0]?.id ?? 0)
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const derived = await scrypt(password, salt, 64)
  return `scrypt:${salt}:${Buffer.from(derived).toString('hex')}`
}

async function seedUser({ username, email, password, roleCode, fullName, employeeCode, jobTitle, branchId }) {
  const [existingRows] = await connection.execute('SELECT id FROM users WHERE username = ? LIMIT 1', [username])
  let userId = Number(existingRows[0]?.id ?? 0)
  let created = false
  let initialPassword = password

  if (!userId) {
    if (!initialPassword) {
      initialPassword = `${randomBytes(12).toString('base64url')}!9a`
      generatedCredentials.push({ username, password: initialPassword })
    }
    const [result] = await connection.execute(
      'INSERT INTO users (username, email, password_hash, status, email_verified_at) VALUES (?, ?, ?, ?, ?)',
      [username, email, await hashPassword(initialPassword), 'active', new Date()],
    )
    userId = Number(result.insertId)
    created = true
  } else {
    await connection.execute('UPDATE users SET email = ?, status = ?, deleted_at = NULL WHERE id = ?', [email, 'active', userId])
  }

  const roleId = await findId('roles', 'code', roleCode)
  if (!roleId) throw new Error(`Không tìm thấy vai trò ${roleCode}. Hãy chạy migration trước.`)
  await connection.execute(
    'INSERT INTO user_roles (user_id, role_id, branch_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role_id = VALUES(role_id), branch_id = VALUES(branch_id)',
    [userId, roleId, branchId],
  )
  await connection.execute(
    'INSERT INTO employees (user_id, branch_id, code, full_name, email, hire_date, job_title, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), branch_id = VALUES(branch_id), full_name = VALUES(full_name), email = VALUES(email), job_title = VALUES(job_title), status = VALUES(status), deleted_at = NULL',
    [userId, branchId, employeeCode, fullName, email, dateInBangkok(-540), jobTitle, 'active'],
  )
  return { id: userId, created }
}

try {
  await connection.beginTransaction()

  const branchId = await findId('branches', 'code', 'MAIN')
  if (!branchId) throw new Error('Không tìm thấy chi nhánh MAIN. Hãy chạy pnpm db:migrate trước.')

  const productCategoryIds = {}
  for (const category of [
    ['Chăm sóc da', 'cham-soc-da'],
    ['Chăm sóc cơ thể', 'cham-soc-co-the'],
    ['Nghi thức tại nhà', 'nghi-thuc-tai-nha'],
  ]) {
    productCategoryIds[category[0]] = await upsert(
      'INSERT INTO product_categories (name, slug, is_active) VALUES (?, ?, true) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), name = VALUES(name), is_active = true',
      category,
    )
  }

  const serviceCategoryId = await upsert(
    'INSERT INTO service_categories (name, slug, is_active) VALUES (?, ?, true) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), name = VALUES(name), is_active = true',
    ['Liệu trình MIÊN', 'lieu-trinh-mien'],
  )

  const serviceSeeds = [
    { code: 'DV-TLTT', name: 'Thả lỏng toàn thân', slug: 'tha-long-toan-than', duration: 75, price: 890000 },
    { code: 'DV-PHLD', name: 'Phục hồi làn da', slug: 'phuc-hoi-lan-da', duration: 60, price: 980000 },
    { code: 'DV-CSDA', name: 'Chăm sóc da đầu', slug: 'cham-soc-da-dau', duration: 50, price: 690000 },
    { code: 'DV-NDDA', name: 'Nghi thức đá ấm', slug: 'nghi-thuc-da-am', duration: 90, price: 1190000 },
  ]
  const serviceIds = {}
  for (const service of serviceSeeds) {
    serviceIds[service.code] = await upsert(
      'INSERT INTO services (category_id, code, name, slug, description, duration_minutes, buffer_minutes, price, is_active) VALUES (?, ?, ?, ?, ?, ?, 15, ?, true) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), category_id = VALUES(category_id), name = VALUES(name), duration_minutes = VALUES(duration_minutes), price = VALUES(price), is_active = true, deleted_at = NULL',
      [serviceCategoryId, service.code, service.name, service.slug, `Liệu trình ${service.name.toLocaleLowerCase('vi')} đặc trưng tại MIÊN.`, service.duration, service.price],
    )
  }

  const locationId = await upsert(
    'INSERT INTO inventory_locations (branch_id, code, name, is_active) VALUES (?, ?, ?, true) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), branch_id = VALUES(branch_id), name = VALUES(name), is_active = true',
    [branchId, 'MAIN-STOCK', 'Kho chính'],
  )

  const productSeeds = [
    { category: 'Chăm sóc da', sku: 'MN-SM-030', name: 'Serum Sương Mai', slug: 'serum-suong-mai', description: 'Tinh chất cấp ẩm nhẹ cho làn da cần được nghỉ ngơi.', price: 780000, stock: 18, min: 6, status: 'active' },
    { category: 'Chăm sóc cơ thể', sku: 'MN-MC-100', name: 'Dầu Cơ Thể Mộc', slug: 'dau-co-the-moc', description: 'Dầu dưỡng cơ thể với kết cấu mỏng và hương thảo mộc dịu.', price: 640000, stock: 7, min: 8, status: 'active' },
    { category: 'Chăm sóc da', sku: 'MN-KA-050', name: 'Kem Dưỡng An', slug: 'kem-duong-an', description: 'Kem dưỡng giúp duy trì độ ẩm và cảm giác mềm da qua đêm.', price: 920000, stock: 24, min: 7, status: 'active' },
    { category: 'Nghi thức tại nhà', sku: 'MN-BT-045', name: 'Balm Thả Lỏng', slug: 'balm-tha-long', description: 'Sáp thơm dùng cho vùng vai gáy trong nghi thức thư giãn tại nhà.', price: 460000, stock: 0, min: 5, status: 'out_of_stock' },
    { category: 'Nghi thức tại nhà', sku: 'MN-MT-240', name: 'Muối Ngâm Chân Tĩnh', slug: 'muoi-ngam-chan-tinh', description: 'Hỗn hợp muối khoáng và thảo mộc cho một buổi tối chậm lại.', price: 390000, stock: 9, min: 10, status: 'active' },
  ]
  for (const product of productSeeds) {
    const productId = await upsert(
      'INSERT INTO products (category_id, sku, name, slug, short_description, sale_price, status) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), category_id = VALUES(category_id), name = VALUES(name), short_description = VALUES(short_description), sale_price = VALUES(sale_price), status = VALUES(status), deleted_at = NULL',
      [productCategoryIds[product.category], product.sku, product.name, product.slug, product.description, product.price, product.status],
    )
    await connection.execute(
      'INSERT INTO inventory_stocks (product_id, location_id, quantity, min_quantity) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE min_quantity = VALUES(min_quantity)',
      [productId, locationId, product.stock, product.min],
    )
    if (product.stock > 0) {
      await connection.execute(
        `INSERT INTO inventory_lots (product_id, location_id, batch_number, received_at, initial_quantity, quantity, unit_cost, status)
         SELECT ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, 0, 'available'
         WHERE NOT EXISTS (SELECT 1 FROM inventory_lots WHERE product_id = ? AND location_id = ?)`,
        [productId, locationId, `SEED-${product.sku}`, product.stock, product.stock, productId, locationId],
      )
    }
    const [[lot]] = await connection.query('SELECT id FROM inventory_lots WHERE product_id = ? AND location_id = ? ORDER BY id LIMIT 1', [productId, locationId])
    await connection.execute(
      `INSERT INTO inventory_transactions (product_id, location_id, lot_id, type, quantity_delta, quantity_after, reference_type, reference_id, note)
       SELECT ?, ?, ?, 'opening', ?, ?, 'seed_opening', ?, 'Tồn đầu kỳ từ dữ liệu mẫu'
       WHERE NOT EXISTS (
         SELECT 1 FROM inventory_transactions WHERE reference_type = 'seed_opening' AND reference_id = ? AND location_id = ? AND type = 'opening'
       )`,
      [productId, locationId, lot?.id ?? null, product.stock, product.stock, productId, productId, locationId],
    )
  }

  const employeeSeeds = [
    ['NV-001', 'Hoàng Bảo Ngọc', '0906845217', 'bao.ngoc@mien.vn', 'Kỹ thuật viên', 'active'],
    ['NV-002', 'Trịnh Thùy Dung', '0932517468', 'thuy.dung@mien.vn', 'Kỹ thuật viên', 'active'],
    ['NV-003', 'Ngô Yến Nhi', '0786429351', 'yen.nhi@mien.vn', 'Kỹ thuật viên', 'active'],
    ['NV-004', 'Đỗ Mai Phương', '0915362847', 'mai.phuong@mien.vn', 'Kỹ thuật viên', 'active'],
    ['NV-005', 'Lâm Tú Anh', '0867241593', 'tu.anh@mien.vn', 'Lễ tân', 'on_leave'],
  ]
  const employeeIds = {}
  for (const employee of employeeSeeds) {
    employeeIds[employee[0]] = await upsert(
      'INSERT INTO employees (branch_id, code, full_name, phone, email, hire_date, job_title, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), full_name = VALUES(full_name), phone = VALUES(phone), email = VALUES(email), job_title = VALUES(job_title), status = VALUES(status), deleted_at = NULL',
      [branchId, employee[0], employee[1], employee[2], employee[3], dateInBangkok(-420), employee[4], employee[5]],
    )
  }

  const ownerUser = await seedUser({
    username: process.env.ADMIN_BOOTSTRAP_USERNAME || 'admin',
    email: process.env.ADMIN_BOOTSTRAP_EMAIL || 'admin@mien.local',
    password: process.env.ADMIN_BOOTSTRAP_PASSWORD,
    roleCode: 'owner',
    fullName: 'Nguyễn Phương Anh',
    employeeCode: 'ADMIN-OWNER',
    jobTitle: 'Chủ hệ thống',
    branchId,
  })
  await seedUser({
    username: process.env.SEED_MANAGER_USERNAME || 'quanly',
    email: process.env.SEED_MANAGER_EMAIL || 'quanly@mien.local',
    password: process.env.SEED_MANAGER_PASSWORD,
    roleCode: 'manager',
    fullName: 'Trần Khánh Vân',
    employeeCode: 'ADMIN-MANAGER',
    jobTitle: 'Quản lý chi nhánh',
    branchId,
  })

  const customerSeeds = [
    ['KH-001', 'Nguyễn Minh Thư', '0938427165', 'minh.thu@example.com', 12840000, 'Ưa thích liệu trình chăm sóc da vào buổi sáng.'],
    ['KH-002', 'Trần Hạ Vy', '0905174826', 'ha.vy@example.com', 6250000, 'Thường đặt lịch cuối tuần.'],
    ['KH-003', 'Phạm Gia Linh', '0773916804', 'gia.linh@example.com', 2860000, null],
    ['KH-004', 'Lê Khánh Chi', '0864251973', 'khanh.chi@example.com', 980000, null],
    ['KH-005', 'Võ Nhật Lam', '0917632048', 'nhat.lam@example.com', 4920000, 'Ưu tiên phòng yên tĩnh.'],
    ['KH-006', 'Đặng An Khuê', '0386149257', 'an.khue@example.com', 10350000, null],
  ]
  const customerIds = {}
  for (const customer of customerSeeds) {
    customerIds[customer[2]] = await upsert(
      'INSERT INTO customers (code, full_name, phone, email, total_spent, notes, source, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), full_name = VALUES(full_name), email = VALUES(email), total_spent = VALUES(total_spent), notes = VALUES(notes), status = VALUES(status), deleted_at = NULL',
      [customer[0], customer[1], customer[2], customer[3], customer[4], customer[5], 'Giới thiệu', 'active'],
    )
  }

  const postCategoryIds = {}
  for (const category of [['Chăm sóc tại nhà', 'cham-soc-tai-nha'], ['Hiểu về cơ thể', 'hieu-ve-co-the'], ['Câu chuyện MIÊN', 'cau-chuyen-mien']]) {
    postCategoryIds[category[0]] = await upsert(
      'INSERT INTO post_categories (name, slug) VALUES (?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), name = VALUES(name)',
      category,
    )
  }

  const postSeeds = [
    ['Chăm sóc tại nhà', 'Một buổi tối để cơ thể chậm lại', 'mot-buoi-toi-de-co-the-cham-lai', 'Những bước nhỏ giúp cơ thể chuyển từ nhịp làm việc sang nghỉ ngơi.', 'Hãy bắt đầu bằng ánh sáng dịu, một hơi thở dài và vài phút không có màn hình. Cơ thể thường cần những tín hiệu rất nhỏ để hiểu rằng ngày dài đã kết thúc.', 'published'],
    ['Hiểu về cơ thể', 'Vì sao da cần những ngày nghỉ', 'vi-sao-da-can-nhung-ngay-nghi', 'Giảm bớt các bước chăm sóc đôi khi là điều làn da đang cần.', 'Một chu trình tối giản giúp bạn quan sát làn da rõ hơn và tránh việc kết hợp quá nhiều hoạt chất trong cùng thời điểm.', 'draft'],
    ['Câu chuyện MIÊN', 'Mùi hương vừa đủ trong phòng trị liệu', 'mui-huong-vua-du-trong-phong-tri-lieu', 'Cách MIÊN lựa chọn một lớp hương nhẹ cho từng không gian.', 'Mùi hương tại MIÊN được giữ ở mức vừa đủ để tạo dấu ấn mà không lấn át cảm nhận tự nhiên của cơ thể.', 'published'],
  ]
  for (const post of postSeeds) {
    await upsert(
      'INSERT INTO posts (category_id, author_id, title, slug, excerpt, content, status, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), category_id = VALUES(category_id), author_id = VALUES(author_id), title = VALUES(title), excerpt = VALUES(excerpt), content = VALUES(content), status = VALUES(status), deleted_at = NULL',
      [postCategoryIds[post[0]], ownerUser.id, post[1], post[2], post[3], post[4], post[5], post[5] === 'published' ? new Date() : null],
    )
  }

  const today = dateInBangkok()
  const bookingSeeds = [
    ['SEED-0915', '0938427165', 'DV-PHLD', 'NV-001', '09:15', 'completed'],
    ['SEED-1040', '0905174826', 'DV-TLTT', 'NV-002', '10:40', 'confirmed'],
    ['SEED-1320', '0864251973', 'DV-CSDA', 'NV-003', '13:20', 'pending'],
    ['SEED-1510', '0917632048', 'DV-NDDA', 'NV-004', '15:10', 'confirmed'],
    ['SEED-1735', '0773916804', 'DV-TLTT', 'NV-001', '17:35', 'pending'],
  ]
  for (const booking of bookingSeeds) {
    const customer = customerSeeds.find(item => item[2] === booking[1])
    const service = serviceSeeds.find(item => item.code === booking[2])
    const startsAt = atBangkok(today, booking[4])
    const endsAt = new Date(startsAt.getTime() + service.duration * 60_000)
    const appointmentId = await upsert(
      'INSERT INTO appointments (reference, branch_id, customer_id, customer_name, customer_phone, starts_at, ends_at, status, source, subtotal, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), customer_id = VALUES(customer_id), customer_name = VALUES(customer_name), starts_at = VALUES(starts_at), ends_at = VALUES(ends_at), status = VALUES(status), subtotal = VALUES(subtotal), total_amount = VALUES(total_amount)',
      [booking[0], branchId, customerIds[booking[1]], customer[1], booking[1], startsAt, endsAt, booking[5], 'admin', service.price, service.price],
    )
    const [existingItems] = await connection.execute('SELECT id FROM appointment_services WHERE appointment_id = ? LIMIT 1', [appointmentId])
    if (existingItems.length) {
      await connection.execute('UPDATE appointment_services SET service_id = ?, employee_id = ?, service_name = ?, duration_minutes = ?, unit_price = ?, final_price = ?, status = ? WHERE id = ?', [serviceIds[booking[2]], employeeIds[booking[3]], service.name, service.duration, service.price, service.price, booking[5] === 'completed' ? 'completed' : 'scheduled', existingItems[0].id])
    } else {
      await connection.execute('INSERT INTO appointment_services (appointment_id, service_id, employee_id, service_name, duration_minutes, unit_price, final_price, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [appointmentId, serviceIds[booking[2]], employeeIds[booking[3]], service.name, service.duration, service.price, service.price, booking[5] === 'completed' ? 'completed' : 'scheduled'])
    }
  }

  await connection.commit()
  console.log('Đã seed dữ liệu mẫu MIÊN Spa thành công.')
  console.log(`Lịch hẹn mẫu được tạo cho ngày ${today}.`)
  if (generatedCredentials.length) {
    console.log('Tài khoản mới dùng mật khẩu sinh ngẫu nhiên (chỉ hiển thị lần này):')
    for (const credential of generatedCredentials) console.log(`- ${credential.username}: ${credential.password}`)
  } else {
    console.log('Tài khoản owner/manager đã tồn tại hoặc dùng mật khẩu cấu hình trong .env.')
  }
} catch (error) {
  await connection.rollback()
  console.error('Seed thất bại:', error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  connection.release()
  await pool.end()
}
