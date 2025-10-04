import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'boolean', default: false })
  isCompleted!: boolean;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
