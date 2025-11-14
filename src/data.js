export const services = [
  {
    id: 1,
    name: "Haircut - Master Barber",
    description: "Premium haircut service by master barber",
    price: 60,
    duration: 30
  },
  {
    id: 2,
    name: "Haircut - Senior Barber",
    description: "Professional haircut by senior barber",
    price: 50,
    duration: 30
  },
  {
    id: 3,
    name: "Buzz Cut",
    description: "Quick and clean buzz cut",
    price: 30,
    duration: 30
  },
  {
    id: 4,
    name: "Beard Trim",
    description: "Professional beard shaping and trimming",
    price: 20,
    duration: 30
  },
  {
    id: 5,
    name: "Beard Trim & Razor",
    description: "Beard trim with straight razor finish",
    price: 40,
    duration: 30
  },
  {
    id: 6,
    name: "Haircut & Beard Trim Straight Razor",
    description: "Complete grooming with straight razor",
    price: 90,
    duration: 60
  },
  {
    id: 7,
    name: "Haircut & Straight Razor Shave",
    description: "Premium haircut with traditional straight razor shave",
    price: 120,
    duration: 60
  },
  {
    id: 8,
    name: "Hot Towel Shave",
    description: "Traditional hot towel straight razor shave",
    price: 60,
    duration: 30
  }
];


export const barbers = [
  {
    id: 1,
    name: "Al",
    specialty: "Master Barber - All Services",
    rating: 5.0,
    image: "/images/barbers/al.jpeg"
  },
  {
    id: 2,
    name: "Cynthia",
    specialty: "Master Barber - All Services",
    rating: 5.0,
    image: "/images/barbers/cynthia.jpeg"
  },
  {
    id: 3,
    name: "Eric",
    specialty: "Senior Barber",
    rating: 5.0,
    image: "/images/barbers/eric.jpg"
  },
  {
    id: 4,
    name: "John",
    specialty: "Master Barber - All Services",
    rating: 5.0,
    image: "/images/barbers/john.jpg"
  },
  {
    id: 5,
    name: "Nick",
    specialty: "Master Barber - All Services",
    rating: 5.0,
    image: "/images/barbers/nick.jpeg"
  },
  {
    id: 6,
    name: "Riza",
    specialty: "Senior Barber",
    rating: 5.0,
    image: "/images/barbers/riza.jpeg"
  }
];

// Generate available time slots
export const generateTimeSlots = (date) => {
  const slots = [];
  const startHour = 10;
  const endHour = 19;
  
  for (let hour = startHour; hour < endHour; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    slots.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  
  return slots;
};
