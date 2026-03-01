import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding colleges...')

  const colleges = [
    { name: 'IIT Bombay',     city: 'Mumbai',          state: 'Maharashtra',  icon: '🏛️' },
    { name: 'IIT Delhi',      city: 'New Delhi',        state: 'Delhi',        icon: '🏛️' },
    { name: 'IIT Madras',     city: 'Chennai',          state: 'Tamil Nadu',   icon: '🏛️' },
    { name: 'IIT Kanpur',     city: 'Kanpur',           state: 'Uttar Pradesh',icon: '🏛️' },
    { name: 'IIT Kharagpur',  city: 'Kharagpur',        state: 'West Bengal',  icon: '🏛️' },
    { name: 'IIT Roorkee',    city: 'Roorkee',          state: 'Uttarakhand',  icon: '🏛️' },
    { name: 'IIT Hyderabad',  city: 'Hyderabad',        state: 'Telangana',    icon: '🏛️' },
    { name: 'NIT Trichy',     city: 'Tiruchirappalli',  state: 'Tamil Nadu',   icon: '🎓' },
    { name: 'NIT Surathkal',  city: 'Mangalore',        state: 'Karnataka',    icon: '🎓' },
    { name: 'NIT Warangal',   city: 'Warangal',         state: 'Telangana',    icon: '🎓' },
    { name: 'BITS Pilani',    city: 'Pilani',           state: 'Rajasthan',    icon: '🏫' },
    { name: 'BITS Hyderabad', city: 'Hyderabad',        state: 'Telangana',    icon: '🏫' },
    { name: 'BITS Goa',       city: 'Goa',              state: 'Goa',          icon: '🏫' },
    { name: 'VIT Vellore',    city: 'Vellore',          state: 'Tamil Nadu',   icon: '🏫' },
    { name: 'SRM Chennai',    city: 'Chennai',          state: 'Tamil Nadu',   icon: '🏫' },
    { name: 'Manipal Institute of Technology', city: 'Manipal', state: 'Karnataka', icon: '🎓' },
    { name: 'Thapar University', city: 'Patiala',       state: 'Punjab',       icon: '🎓' },
    { name: 'Delhi University',  city: 'New Delhi',     state: 'Delhi',        icon: '🏛️' },
    { name: 'Mumbai University', city: 'Mumbai',        state: 'Maharashtra',  icon: '🏛️' },
    { name: 'Anna University',   city: 'Chennai',       state: 'Tamil Nadu',   icon: '🏛️' },
    { name: 'Jadavpur University', city: 'Kolkata',     state: 'West Bengal',  icon: '🎓' },
    { name: 'PSG College of Technology', city: 'Coimbatore', state: 'Tamil Nadu', icon: '🎓' },
    { name: 'Amity University', city: 'Noida',          state: 'Uttar Pradesh',icon: '🏫' },
    { name: 'Symbiosis Institute of Technology', city: 'Pune', state: 'Maharashtra', icon: '🏫' },
    { name: 'Pune Institute of Computer Technology', city: 'Pune', state: 'Maharashtra', icon: '🎓' },
  ]

  for (const college of colleges) {
    await prisma.college.upsert({
      where: { name: college.name },
      update: {},
      create: college,
    })
  }

  console.log(`✅ Seeded ${colleges.length} colleges`)
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })