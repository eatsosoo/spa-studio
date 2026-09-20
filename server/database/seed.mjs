import mysql from 'mysql2/promise'
import { randomBytes, scrypt as scryptCallback } from 'node:crypto'
import { promisify } from 'node:util'
import { detailedPostSeeds } from './seed-posts.mjs'

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
    { category: 'Chăm sóc da', sku: 'MN-SM-030', name: 'Serum Sương Mai', slug: 'serum-suong-mai', description: 'Tinh chất cấp ẩm nhẹ cho làn da cần được nghỉ ngơi.', price: 780000, stock: 18, min: 6, status: 'active', size: '30 ml', benefits: ['Giữ ẩm lâu nhưng không bí da', 'Làm dịu cảm giác căng rát', 'Dùng được sáng và tối'], ingredients: 'Dầu cám gạo, squalane thực vật, chiết xuất rau má và vitamin E.', usage: 'Sau bước cân bằng, làm ấm 2–3 giọt trong lòng bàn tay rồi áp nhẹ lên mặt và cổ.', position: '16% center' },
    { category: 'Chăm sóc cơ thể', sku: 'MN-MC-100', name: 'Dầu Cơ Thể Mộc', slug: 'dau-co-the-moc', description: 'Dầu dưỡng cơ thể với kết cấu mỏng và hương thảo mộc dịu.', price: 640000, stock: 7, min: 8, status: 'active', size: '100 ml', benefits: ['Làm mềm vùng da khô', 'Phù hợp massage vai gáy', 'Không để lại màng bóng'], ingredients: 'Dầu hạt nho, dầu jojoba, cám gạo và hỗn hợp tinh dầu tuyết tùng nồng độ thấp.', usage: 'Thoa lên da còn hơi ẩm sau khi tắm hoặc làm ấm trong tay trước khi massage.', position: '39% center' },
    { category: 'Chăm sóc da', sku: 'MN-KA-050', name: 'Kem Dưỡng An', slug: 'kem-duong-an', description: 'Kem dưỡng giúp duy trì độ ẩm và cảm giác mềm da qua đêm.', price: 920000, stock: 24, min: 7, status: 'active', size: '50 g', benefits: ['Khóa ẩm qua đêm', 'Hỗ trợ hàng rào bảo vệ da', 'Không chứa màu tổng hợp'], ingredients: 'Ceramide, bơ hạt mỡ, beta-glucan và chiết xuất yến mạch.', usage: 'Lấy lượng bằng một hạt đậu, tán đều ở bước cuối của chu trình dưỡng da.', position: '64% center' },
    { category: 'Nghi thức tại nhà', sku: 'MN-BT-045', name: 'Balm Thả Lỏng', slug: 'balm-tha-long', description: 'Sáp thơm dùng cho vùng vai gáy trong nghi thức thư giãn tại nhà.', price: 460000, stock: 0, min: 5, status: 'out_of_stock', size: '45 g', benefits: ['Hỗ trợ thư giãn vùng vai gáy', 'Gọn để mang theo', 'Hương thơm không lưu quá lâu'], ingredients: 'Bơ xoài, sáp cám gạo, dầu gừng và tinh dầu hương thảo.', usage: 'Lấy một lượng nhỏ, làm ấm bằng đầu ngón tay rồi massage theo chuyển động tròn.', position: '88% center' },
    { category: 'Nghi thức tại nhà', sku: 'MN-MT-240', name: 'Muối Ngâm Chân Tĩnh', slug: 'muoi-ngam-chan-tinh', description: 'Hỗn hợp muối khoáng và thảo mộc cho một buổi tối chậm lại.', price: 390000, stock: 9, min: 10, status: 'active', size: '240 g', benefits: ['Làm ấm bàn chân', 'Thư giãn sau ngày dài', 'Hương thảo mộc dịu'], ingredients: 'Muối khoáng, gừng, sả và lá thảo mộc sấy khô.', usage: 'Hòa hai thìa vào nước ấm và ngâm chân trong 15–20 phút.', position: 'center' },
  ]
  const productIds = {}
  for (const product of productSeeds) {
    const productId = await upsert(
      'INSERT INTO products (category_id, sku, name, slug, short_description, description, size, benefits, ingredients, `usage`, sale_price, status, image_url, image_position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), category_id = VALUES(category_id), name = VALUES(name), short_description = VALUES(short_description), description = VALUES(description), size = VALUES(size), benefits = VALUES(benefits), ingredients = VALUES(ingredients), `usage` = VALUES(`usage`), sale_price = VALUES(sale_price), status = VALUES(status), image_url = VALUES(image_url), image_position = VALUES(image_position), deleted_at = NULL',
      [productCategoryIds[product.category], product.sku, product.name, product.slug, product.description, product.description, product.size, JSON.stringify(product.benefits), product.ingredients, product.usage, product.price, product.status, '/images/mien-product-collection.png', product.position],
    )
    productIds[product.sku] = productId
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

  const demoCustomerPassword = process.env.SEED_CUSTOMER_PASSWORD || 'MienDemo123'
  const demoCustomerPasswordHash = await hashPassword(demoCustomerPassword)
  for (const phone of ['0938427165', '0905174826']) {
    await connection.execute(
      `UPDATE customers
       SET password_hash = COALESCE(password_hash, ?),
           password_changed_at = COALESCE(password_changed_at, CURRENT_TIMESTAMP),
           gender = COALESCE(gender, 'female'),
           date_of_birth = COALESCE(date_of_birth, ?),
           address = COALESCE(address, ?),
           loyalty_points = GREATEST(loyalty_points, ?),
           marketing_consent = true
       WHERE id = ?`,
      [demoCustomerPasswordHash, phone === '0938427165' ? '1992-05-18' : '1996-11-03', '18 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội', phone === '0938427165' ? 1280 : 625, customerIds[phone]],
    )
  }

  const postCategoryIds = {}
  for (const category of [['Chăm sóc tại nhà', 'cham-soc-tai-nha'], ['Hiểu về cơ thể', 'hieu-ve-co-the'], ['Câu chuyện MIÊN', 'cau-chuyen-mien'], ['Chăm sóc sức khỏe', 'cham-soc-suc-khoe']]) {
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

  for (const post of detailedPostSeeds) {
    await upsert(
      `INSERT INTO posts (category_id, author_id, title, slug, excerpt, content, featured_image_url, meta_title, meta_description, focus_keyword, secondary_keywords, status, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?)
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), category_id = VALUES(category_id), author_id = VALUES(author_id), title = VALUES(title), excerpt = VALUES(excerpt), content = VALUES(content), featured_image_url = VALUES(featured_image_url), meta_title = VALUES(meta_title), meta_description = VALUES(meta_description), focus_keyword = VALUES(focus_keyword), secondary_keywords = VALUES(secondary_keywords), status = 'published', published_at = COALESCE(published_at, VALUES(published_at)), deleted_at = NULL`,
      [postCategoryIds[post.category], ownerUser.id, post.title, post.slug, post.excerpt, post.content, `/images/articles/${post.slug}.webp`, post.metaTitle, post.metaDescription, post.focusKeyword, JSON.stringify(post.secondaryKeywords), new Date()],
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
  const appointmentIds = {}
  for (const booking of bookingSeeds) {
    const customer = customerSeeds.find(item => item[2] === booking[1])
    const service = serviceSeeds.find(item => item.code === booking[2])
    const startsAt = atBangkok(today, booking[4])
    const endsAt = new Date(startsAt.getTime() + service.duration * 60_000)
    const appointmentId = await upsert(
      'INSERT INTO appointments (reference, branch_id, customer_id, customer_name, customer_phone, starts_at, ends_at, status, source, subtotal, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), customer_id = VALUES(customer_id), customer_name = VALUES(customer_name), starts_at = VALUES(starts_at), ends_at = VALUES(ends_at), status = VALUES(status), subtotal = VALUES(subtotal), total_amount = VALUES(total_amount)',
      [booking[0], branchId, customerIds[booking[1]], customer[1], booking[1], startsAt, endsAt, booking[5], 'admin', service.price, service.price],
    )
    appointmentIds[booking[0]] = appointmentId
    const [existingItems] = await connection.execute('SELECT id FROM appointment_services WHERE appointment_id = ? LIMIT 1', [appointmentId])
    if (existingItems.length) {
      await connection.execute('UPDATE appointment_services SET service_id = ?, employee_id = ?, service_name = ?, duration_minutes = ?, unit_price = ?, final_price = ?, status = ? WHERE id = ?', [serviceIds[booking[2]], employeeIds[booking[3]], service.name, service.duration, service.price, service.price, booking[5] === 'completed' ? 'completed' : 'scheduled', existingItems[0].id])
    } else {
      await connection.execute('INSERT INTO appointment_services (appointment_id, service_id, employee_id, service_name, duration_minutes, unit_price, final_price, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [appointmentId, serviceIds[booking[2]], employeeIds[booking[3]], service.name, service.duration, service.price, service.price, booking[5] === 'completed' ? 'completed' : 'scheduled'])
    }
  }

  const historicalBookingSeeds = [
    ['SEED-HIST-COMP-001', '0938427165', 'DV-TLTT', 'NV-001', -35, '10:00', 'completed'],
    ['SEED-HIST-COMP-002', '0905174826', 'DV-PHLD', 'NV-002', -24, '14:30', 'completed'],
    ['SEED-HIST-CANCEL-001', '0905174826', 'DV-CSDA', 'NV-003', -16, '09:30', 'cancelled'],
    ['SEED-HIST-NOSHOW-001', '0773916804', 'DV-NDDA', 'NV-004', -9, '16:00', 'no_show'],
  ]
  for (const booking of historicalBookingSeeds) {
    const customer = customerSeeds.find(item => item[2] === booking[1])
    const service = serviceSeeds.find(item => item.code === booking[2])
    const date = dateInBangkok(Number(booking[4]))
    const startsAt = atBangkok(date, booking[5])
    const endsAt = new Date(startsAt.getTime() + service.duration * 60_000)
    const status = booking[6]
    const appointmentId = await upsert(
      `INSERT INTO appointments (reference, branch_id, customer_id, customer_name, customer_phone, starts_at, ends_at, status, source, subtotal, total_amount, cancellation_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'admin', ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), customer_id = VALUES(customer_id), starts_at = VALUES(starts_at), ends_at = VALUES(ends_at), status = VALUES(status), cancellation_reason = VALUES(cancellation_reason)`,
      [booking[0], branchId, customerIds[booking[1]], customer[1], booking[1], startsAt, endsAt, status, service.price, service.price, status === 'cancelled' ? 'Khách đổi kế hoạch cá nhân.' : null],
    )
    appointmentIds[booking[0]] = appointmentId
    const [existingItems] = await connection.execute('SELECT id FROM appointment_services WHERE appointment_id = ? AND service_id = ? LIMIT 1', [appointmentId, serviceIds[booking[2]]])
    const itemStatus = status === 'completed' ? 'completed' : status === 'cancelled' ? 'cancelled' : 'scheduled'
    if (existingItems.length) {
      await connection.execute('UPDATE appointment_services SET employee_id = ?, service_name = ?, duration_minutes = ?, unit_price = ?, final_price = ?, status = ?, completed_at = ? WHERE id = ?', [employeeIds[booking[3]], service.name, service.duration, service.price, service.price, itemStatus, status === 'completed' ? endsAt : null, existingItems[0].id])
    } else {
      await connection.execute('INSERT INTO appointment_services (appointment_id, service_id, employee_id, service_name, duration_minutes, unit_price, final_price, status, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [appointmentId, serviceIds[booking[2]], employeeIds[booking[3]], service.name, service.duration, service.price, service.price, itemStatus, status === 'completed' ? endsAt : null])
    }
    await connection.execute(
      `INSERT INTO appointment_events (appointment_id, customer_id, actor, action, new_values, created_at)
       SELECT ?, ?, 'system', ?, ?, ?
       WHERE NOT EXISTS (SELECT 1 FROM appointment_events WHERE appointment_id = ? AND action = ?)`,
      [appointmentId, customerIds[booking[1]], `seed.${status}`, JSON.stringify({ status }), endsAt, appointmentId, `seed.${status}`],
    )
  }

  const orderSeeds = [
    {
      reference: 'SEED-DH-DELIVERED-001', phone: '0938427165', createdOffset: -28,
      status: 'paid', paymentStatus: 'paid', fulfillmentStatus: 'delivered', paymentMethod: 'bank_transfer',
      items: [['MN-SM-030', 1], ['MN-MC-100', 2]],
    },
    {
      reference: 'SEED-DH-SHIPPED-001', phone: '0938427165', createdOffset: -5,
      status: 'confirmed', paymentStatus: 'paid', fulfillmentStatus: 'shipped', paymentMethod: 'bank_transfer',
      items: [['MN-KA-050', 1]],
    },
    {
      reference: 'SEED-DH-DRAFT-001', phone: '0905174826', createdOffset: -2,
      status: 'draft', paymentStatus: 'unpaid', fulfillmentStatus: 'unfulfilled', paymentMethod: 'cod',
      items: [['MN-SM-030', 1], ['MN-MT-240', 2]],
    },
    {
      reference: 'SEED-DH-CANCELLED-001', phone: '0773916804', createdOffset: -12,
      status: 'cancelled', paymentStatus: 'unpaid', fulfillmentStatus: 'unfulfilled', paymentMethod: 'cod',
      items: [['MN-KA-050', 1]], cancellationReason: 'Khách thay đổi nhu cầu.',
    },
    {
      reference: 'SEED-DH-DELIVERED-002', phone: '0905174826', createdOffset: -40,
      status: 'paid', paymentStatus: 'paid', fulfillmentStatus: 'delivered', paymentMethod: 'cod',
      items: [['MN-MT-240', 1]],
    },
  ]
  const orderIds = {}
  for (const order of orderSeeds) {
    const customer = customerSeeds.find(item => item[2] === order.phone)
    const createdAt = atBangkok(dateInBangkok(order.createdOffset), '11:00')
    const subtotal = order.items.reduce((sum, [sku, quantity]) => sum + productSeeds.find(product => product.sku === sku).price * quantity, 0)
    const shippingFee = subtotal >= 1_200_000 ? 0 : 40_000
    const isDelivered = order.fulfillmentStatus === 'delivered'
    const isCancelled = order.status === 'cancelled'
    const confirmedAt = order.status === 'draft' || isCancelled ? null : new Date(createdAt.getTime() + 60 * 60_000)
    const paidAt = order.paymentStatus === 'paid' ? new Date(createdAt.getTime() + 2 * 60 * 60_000) : null
    const completedAt = isDelivered ? new Date(createdAt.getTime() + 3 * 86_400_000) : null
    const cancelledAt = isCancelled ? new Date(createdAt.getTime() + 4 * 60 * 60_000) : null
    const orderId = await upsert(
      `INSERT INTO sales_orders (
         reference, branch_id, inventory_location_id, customer_id, source, idempotency_key,
         customer_name, customer_phone, customer_email, shipping_address_line, shipping_ward, shipping_district, shipping_province,
         shipping_fee, payment_method, payment_status, fulfillment_status, status, subtotal, discount_amount, total_amount,
         confirmed_at, paid_at, cancelled_at, completed_at, cancellation_reason, created_at
       ) VALUES (?, ?, ?, ?, 'website', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), customer_id = VALUES(customer_id), customer_name = VALUES(customer_name), customer_phone = VALUES(customer_phone), customer_email = VALUES(customer_email), shipping_fee = VALUES(shipping_fee), payment_method = VALUES(payment_method), payment_status = VALUES(payment_status), fulfillment_status = VALUES(fulfillment_status), status = VALUES(status), subtotal = VALUES(subtotal), total_amount = VALUES(total_amount), confirmed_at = VALUES(confirmed_at), paid_at = VALUES(paid_at), cancelled_at = VALUES(cancelled_at), completed_at = VALUES(completed_at), cancellation_reason = VALUES(cancellation_reason)`,
      [order.reference, branchId, locationId, customerIds[order.phone], `seed-${order.reference.toLowerCase()}`, customer[1], order.phone, customer[3], '18 Trần Hưng Đạo', 'Phường Cửa Nam', 'Hoàn Kiếm', 'Hà Nội', shippingFee, order.paymentMethod, order.paymentStatus, order.fulfillmentStatus, order.status, subtotal, subtotal + shippingFee, confirmedAt, paidAt, cancelledAt, completedAt, order.cancellationReason ?? null, createdAt],
    )
    orderIds[order.reference] = orderId
    for (const [sku, quantity] of order.items) {
      const product = productSeeds.find(item => item.sku === sku)
      const [existingItems] = await connection.execute('SELECT id FROM sales_order_items WHERE order_id = ? AND product_id = ? LIMIT 1', [orderId, productIds[sku]])
      const totalAmount = product.price * quantity
      if (existingItems.length) {
        await connection.execute('UPDATE sales_order_items SET sku = ?, product_name = ?, quantity = ?, unit_price = ?, discount_amount = 0, total_amount = ? WHERE id = ?', [sku, product.name, quantity, product.price, totalAmount, existingItems[0].id])
      } else {
        await connection.execute('INSERT INTO sales_order_items (order_id, product_id, sku, product_name, quantity, unit_price, discount_amount, total_amount) VALUES (?, ?, ?, ?, ?, ?, 0, ?)', [orderId, productIds[sku], sku, product.name, quantity, product.price, totalAmount])
      }
    }
    const historyByState = {
      draft: ['draft'],
      confirmed: order.fulfillmentStatus === 'shipped' ? ['draft', 'confirmed', 'packing', 'shipped'] : ['draft', 'confirmed'],
      paid: ['draft', 'confirmed', 'packing', 'shipped', 'completed'],
      cancelled: ['draft', 'cancelled'],
    }
    for (const [index, status] of historyByState[order.status].entries()) {
      const note = `Dữ liệu mẫu: ${status}`
      await connection.execute(
        `INSERT INTO sales_order_status_history (order_id, status, note, created_at)
         SELECT ?, ?, ?, ?
         WHERE NOT EXISTS (SELECT 1 FROM sales_order_status_history WHERE order_id = ? AND status = ? AND note = ?)`,
        [orderId, status, note, new Date(createdAt.getTime() + index * 60 * 60_000), orderId, status, note],
      )
    }
  }

  const feedbackSeeds = [
    {
      customerId: customerIds['0938427165'], type: 'service', appointmentId: appointmentIds['SEED-HIST-COMP-001'], serviceId: serviceIds['DV-TLTT'],
      rating: 5, content: 'Không gian rất yên và kỹ thuật viên chăm sóc chu đáo. Tôi cảm thấy cơ thể nhẹ hơn sau buổi trị liệu.', status: 'approved', note: 'Nội dung phù hợp.',
    },
    {
      customerId: customerIds['0938427165'], type: 'product', orderId: orderIds['SEED-DH-DELIVERED-001'], productId: productIds['MN-SM-030'],
      rating: 4, content: 'Serum thấm nhanh, dùng buổi tối dễ chịu và không gây cảm giác bí da.', status: 'pending', note: null,
    },
    {
      customerId: customerIds['0905174826'], type: 'service', appointmentId: appointmentIds['SEED-HIST-COMP-002'], serviceId: serviceIds['DV-PHLD'],
      rating: 3, content: 'Liệu trình ổn nhưng nội dung cũ cần được nhân viên kiểm tra lại trước khi hiển thị.', status: 'hidden', note: 'Tạm ẩn để liên hệ khách xác minh.',
    },
    {
      customerId: customerIds['0905174826'], type: 'product', orderId: orderIds['SEED-DH-DELIVERED-002'], productId: productIds['MN-MT-240'],
      rating: 5, content: 'Mùi thảo mộc dịu, gói sản phẩm cẩn thận và hướng dẫn sử dụng rõ ràng.', status: 'approved', note: 'Nội dung phù hợp.',
    },
  ]
  for (const feedback of feedbackSeeds) {
    await upsert(
      `INSERT INTO feedbacks (customer_id, product_id, service_id, appointment_id, order_id, subject_type, rating, content, status, moderation_note, moderated_by, moderated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), rating = VALUES(rating), content = VALUES(content), status = VALUES(status), moderation_note = VALUES(moderation_note), moderated_by = VALUES(moderated_by), moderated_at = VALUES(moderated_at), deleted_at = NULL`,
      [feedback.customerId, feedback.productId ?? null, feedback.serviceId ?? null, feedback.appointmentId ?? null, feedback.orderId ?? null, feedback.type, feedback.rating, feedback.content, feedback.status, feedback.note, feedback.status === 'pending' ? null : ownerUser.id, feedback.status === 'pending' ? null : new Date()],
    )
  }

  await connection.commit()
  console.log('Đã seed dữ liệu mẫu MIÊN Spa thành công.')
  console.log(`Lịch hẹn mẫu được tạo cho ngày ${today}.`)
  console.log(`Tài khoản khách mẫu: 0938427165 / ${process.env.SEED_CUSTOMER_PASSWORD ? 'mật khẩu từ SEED_CUSTOMER_PASSWORD' : demoCustomerPassword}`)
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
