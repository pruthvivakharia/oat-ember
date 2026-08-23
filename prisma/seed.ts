import {PrismaClient} from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma=new PrismaClient();
const products=[
 ['Cold Brew','cold-brew','Slow-steeped, chocolatey and ice-cold.','Cold Brew',190,'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=900&q=80'],
 ['Flat White','flat-white','Silky microfoam with a double espresso base.','Espresso',180,'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80'],
 ['Matcha Cloud','matcha-cloud','Ceremonial matcha with vanilla foam.','Matcha',220,'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=900&q=80'],
 ['Cinnamon Roll','cinnamon-roll','Warm, sticky, buttery and unapologetically gooey.','Pastries',160,'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80'],
 ['Berry Basque','berry-basque','Creamy burnt cheesecake with berry compote.','Pastries',240,'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80'],
];
async function main(){await prisma.product.updateMany({where:{category:'Merch'},data:{available:false}});const password=await bcrypt.hash('admin123',12);await prisma.user.upsert({where:{email:'admin@cafe.com'},update:{password,role:'ADMIN',phone:'9999999999'},create:{email:'admin@cafe.com',name:'Café Admin',password,role:'ADMIN',phone:'9999999999'}});for(const p of products){await prisma.product.upsert({where:{slug:p[1] as string},update:{name:p[0] as string,description:p[2] as string,category:p[3] as string,price:p[4] as number,image:p[5] as string},create:{name:p[0] as string,slug:p[1] as string,description:p[2] as string,category:p[3] as string,price:p[4] as number,image:p[5] as string}})} }
main().finally(()=>prisma.$disconnect());
