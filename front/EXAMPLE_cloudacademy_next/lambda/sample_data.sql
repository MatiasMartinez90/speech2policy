-- Datos de ejemplo para testing del sistema de cursos
-- Ejecuta estos comandos en tu base de datos PostgreSQL

-- Insertar datos de progreso de cursos para el usuario que ya existe
-- Usamos el ID del usuario que ya se registró: e41b0d72-62bc-48af-9dff-40c2c7bb1029

INSERT INTO user_course_progress (user_id, course_id, progress_percentage, started_at, last_accessed) VALUES
('e41b0d72-62bc-48af-9dff-40c2c7bb1029', 'aws-fundamentals', 45, '2025-07-10 10:00:00', '2025-07-12 09:30:00'),
('e41b0d72-62bc-48af-9dff-40c2c7bb1029', 'docker-basics', 100, '2025-07-08 14:00:00', '2025-07-11 16:45:00'),
('e41b0d72-62bc-48af-9dff-40c2c7bb1029', 'kubernetes-intro', 20, '2025-07-11 11:00:00', '2025-07-12 08:15:00'),
('e41b0d72-62bc-48af-9dff-40c2c7bb1029', 'terraform-advanced', 75, '2025-07-05 09:00:00', '2025-07-12 10:00:00')
ON CONFLICT (user_id, course_id) DO UPDATE SET
    progress_percentage = EXCLUDED.progress_percentage,
    last_accessed = EXCLUDED.last_accessed;

-- Actualizar el curso completado con fecha de finalización
UPDATE user_course_progress 
SET completed_at = '2025-07-11 16:45:00' 
WHERE user_id = 'e41b0d72-62bc-48af-9dff-40c2c7bb1029' 
AND course_id = 'docker-basics' 
AND progress_percentage = 100;

-- Insertar algunos eventos de analytics para el usuario
INSERT INTO user_analytics (user_id, event_type, event_data) VALUES
('e41b0d72-62bc-48af-9dff-40c2c7bb1029', 'course_started', '{"course_id": "aws-fundamentals", "timestamp": "2025-07-10T10:00:00Z"}'),
('e41b0d72-62bc-48af-9dff-40c2c7bb1029', 'lesson_completed', '{"course_id": "aws-fundamentals", "lesson_id": "intro-to-aws", "timestamp": "2025-07-10T10:30:00Z"}'),
('e41b0d72-62bc-48af-9dff-40c2c7bb1029', 'course_completed', '{"course_id": "docker-basics", "timestamp": "2025-07-11T16:45:00Z"}'),
('e41b0d72-62bc-48af-9dff-40c2c7bb1029', 'course_started', '{"course_id": "kubernetes-intro", "timestamp": "2025-07-11T11:00:00Z"}');

-- Verificar los datos insertados
SELECT 
    u.name, 
    u.email,
    ucp.course_id,
    ucp.progress_percentage,
    ucp.started_at,
    ucp.completed_at,
    ucp.last_accessed
FROM users u
JOIN user_course_progress ucp ON u.id = ucp.user_id
WHERE u.id = 'e41b0d72-62bc-48af-9dff-40c2c7bb1029'
ORDER BY ucp.last_accessed DESC;