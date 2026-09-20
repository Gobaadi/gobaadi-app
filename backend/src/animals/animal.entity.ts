import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('animals')
export class Animal {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ nullable: true })
  userId?: number;

  @Index()
  @Column()
  name: string;

  @Index()
  @Column()
  breed: string;

  @Column()
  weight: string;

  @Column()
  age: string;

  @Column()
  color: string;

  @Column({ nullable: true })
  image?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  dob?: string;

  @Column({ nullable: true })
  gender?: string;

  @Column({ nullable: true })
  source?: string;

  @Column({ nullable: true })
  joinedFarm?: string;

  @Column({ nullable: true })
  liveWeight?: string;

  @Column({ nullable: true })
  reproStatus?: string;

  @Column({ type: 'simple-json', nullable: true })
  photos?: string[];

  @Column({ nullable: true })
  photoCost?: string;

  @Column({ nullable: true })
  sellingPrice?: string;

  @Column({ nullable: true })
  liveWeightPrice?: string;
}
