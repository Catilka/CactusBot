const mineflayer = require('mineflayer')
const FlayerCaptcha = require('flayercaptcha')
const TelegramBot = require('node-telegram-bot-api')
const readline = require('readline')

// Конфигурация бота
const botConfig = {
    host: 'play.funtime.su', // IP сервера FunTime
    port: 25565,       // Порт сервера
    username: 'CactusBot', // Имя бота
    version: '1.20.1', // Версия сервера
    telegramBotToken: '8147094752:AAFwDBV9ko0kn5UwuU7uy7vdnzid9QEHlQo', // Telegram Bot Token
    telegramChatId: '-1002590113844' // Telegram Chat ID
}

const telegramBot = new TelegramBot(botConfig.telegramBotToken, { polling: false })

// Настройка ввода через консоль
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function createBot() {
  const bot = mineflayer.createBot({
    host: botConfig.host,
    port: botConfig.port,
    username: botConfig.username,
    version: botConfig.version
  })

  // Флаг для отслеживания активной капчи
  let isCaptchaActive = false

  // Инициализация FlayerCaptcha
  let captcha
  try {
    captcha = new FlayerCaptcha(bot)
    console.log('FlayerCaptcha инициализирован')
  } catch (err) {
    console.error('Ошибка инициализации FlayerCaptcha:', err.message)
    process.exit(1)
  }

  // Обработка капчи
  captcha.on('success', async (image, viewDirection) => {
    console.log('Получена капча, направление взгляда:', viewDirection)
    isCaptchaActive = true // Приостанавливаем /bal
    try {
      // Получаем буфер изображения
      const imageBuffer = await image.toBuffer()
      // Отправляем изображение в Telegram
      await telegramBot.sendPhoto(botConfig.telegramChatId, imageBuffer, { caption: 'Капча получена' })
      console.log('Капча отправлена в Telegram')
      // Запрашиваем ответ через консоль
      rl.question('Введите ответ на капчу: ', (answer) => {
        bot.chat(answer)
        console.log(`[Капча] Отправлен ответ: ${answer}`)
        isCaptchaActive = false // Возобновляем /bal
      })
    } catch (err) {
      console.error('Ошибка обработки капчи:', err.message)
      isCaptchaActive = false // Возобновляем /bal в случае ошибки
    }
  })

  // Обработка ошибок
  bot.on('error', (err) => console.log('Ошибка бота:', err))
  bot.on('kicked', (reason) => console.log('Бот кикнут:', reason))
  bot.on('end', () => {
    console.log('Бот отключился. Переподключение через 5 секунд...')
    setTimeout(createBot, 5000)
  })

  // Обработка сообщений чата
  bot.on('chat', (username, message) => {
    if (username === bot.username) return // Игнорируем собственные сообщения
    // Проверяем сообщения о балансе
    if (message.toLowerCase().includes('баланс') || message.match(/\+.*баланс/i)) {
      console.log(`[Чат] ${username}: ${message}`)
      // Попытка извлечь баланс из сообщения
      const balanceMatch = message.match(/баланс.*?:?\s*(\d+)/i)
      if (balanceMatch) {
        const balance = balanceMatch[1]
        const telegramMessage = `Баланс бота (${botConfig.username}) на FunTime: ${balance}`
        // Отправляем баланс в Telegram
        telegramBot.sendMessage(botConfig.telegramChatId, telegramMessage)
          .then(() => console.log(`Отправлено в Telegram: ${telegramMessage}`))
          .catch(err => console.error('Ошибка отправки в Telegram:', err.message))
      } else {
        // Если не удалось извлечь баланс, отправляем полное сообщение
        telegramBot.sendMessage(botConfig.telegramChatId, `Сообщение о балансе: ${message}`)
          .then(() => console.log(`Отправлено в Telegram: ${message}`))
          .catch(err => console.error('Ошибка отправки в Telegram:', err.message))
      }
    }
  })

  // Когда бот заспавнился
  bot.on('spawn', async () => {
      bot.chat("/l 1")
      await bot.waitForTicks(20)
      bot.chat("/an303")
      console.log('Бот заспавнился!')
      await bot.waitForTicks(20) // Ждем 1 секунду для стабилизации

      // Цикл для отправки /bal каждые 5 секунд
      setInterval(() => {
        if (!isCaptchaActive) {
          try {
            bot.chat('/bal')
            console.log('Отправлена команда /bal')
          } catch (err) {
            console.log('Ошибка при отправке /bal:', err.message)
          }
        } else {
          console.log('Отправка /bal приостановлена из-за активной капчи')
        }
      }, 5000) // 5000 мс = 5 секунд

      // Цикл для выполнения ЛКМ каждые 2 секунды
      setInterval(() => {
        if (!isCaptchaActive) {
          try {
            bot.swingArm('left')
            console.log('Бот выполнил ЛКМ')
          } catch (err) {
            console.log('Ошибка при выполнении ЛКМ:', err.message)
          }
        } else {
          console.log('ЛКМ приостановлен из-за активной капчи')
        }
      }, 2000) // 2000 мс = 2 секунды
  })

  // Обработка ошибок чтения пакетов
  bot.on('packetError', (err, packet) => {
    console.log('Ошибка пакета:', err.message, 'Пакет:', packet)
  })
}

// Запускаем бота
createBot()
