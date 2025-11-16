import asyncio
import asyncpg
import logging
from typing import Optional, Dict, Any, List

from app.config.settings import settings

logger = logging.getLogger(__name__)

class DatabaseConnection:
    """Database connection manager"""
    
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
    
    async def connect(self) -> bool:
        """Establish database connection pool"""
        try:
            self.pool = await asyncpg.create_pool(
                host=settings.db_host,
                port=settings.db_port,
                user=settings.db_user,
                password=settings.db_password,
                database=settings.db_name,
                min_size=1,
                max_size=10,
                command_timeout=60
            )
            logger.info("✅ Database connection pool created")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to create database pool: {str(e)}")
            return False
    
    async def disconnect(self):
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()
            logger.info("🔌 Database connection pool closed")
    
    async def execute_query(self, query: str, *args) -> List[Dict[str, Any]]:
        """Execute a SELECT query and return results"""
        if not self.pool:
            await self.connect()
        
        try:
            async with self.pool.acquire() as connection:
                rows = await connection.fetch(query, *args)
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"❌ Query execution failed: {str(e)}")
            raise
    
    async def execute_command(self, command: str, *args) -> str:
        """Execute an INSERT/UPDATE/DELETE command"""
        if not self.pool:
            await self.connect()
        
        try:
            async with self.pool.acquire() as connection:
                result = await connection.execute(command, *args)
                return result
        except Exception as e:
            logger.error(f"❌ Command execution failed: {str(e)}")
            raise

# Global database instance
db = DatabaseConnection()

async def test_db_connection() -> bool:
    """Test database connectivity"""
    try:
        if not db.pool:
            await db.connect()
        
        # Simple connectivity test
        result = await db.execute_query("SELECT 1 as test")
        return len(result) == 1 and result[0]['test'] == 1
        
    except Exception as e:
        logger.error(f"❌ Database connection test failed: {str(e)}")
        return False

async def get_user_progress_data(user_id: str) -> Dict[str, Any]:
    """Get user progress data from database"""
    try:
        # Query 1: User info + aggregated statistics
        user_stats_query = """
            SELECT u.id, u.name, u.email,
                   COUNT(ucp.id) as total_courses_enrolled,
                   COUNT(CASE WHEN ucp.progress_percentage = 100 THEN 1 END) as courses_completed,
                   COALESCE(AVG(ucp.progress_percentage), 0) as average_progress
            FROM users u 
            LEFT JOIN user_course_progress ucp ON u.id = ucp.user_id
            WHERE u.id = $1 
            GROUP BY u.id, u.name, u.email
        """
        
        user_stats = await db.execute_query(user_stats_query, user_id)
        
        if not user_stats:
            raise ValueError(f"User not found: {user_id}")
        
        user_info = user_stats[0]
        
        # Query 2: Individual courses
        courses_query = """
            SELECT course_id, progress_percentage, started_at, completed_at, last_accessed
            FROM user_course_progress 
            WHERE user_id = $1
            ORDER BY last_accessed DESC
        """
        
        courses = await db.execute_query(courses_query, user_id)
        
        # Format response
        return {
            "user": {
                "id": user_info["id"],
                "name": user_info["name"],
                "email": user_info["email"]
            },
            "statistics": {
                "total_courses_enrolled": user_info["total_courses_enrolled"],
                "courses_completed": user_info["courses_completed"],
                "average_progress": float(user_info["average_progress"])
            },
            "courses": [
                {
                    "course_id": course["course_id"],
                    "progress_percentage": course["progress_percentage"],
                    "started_at": course["started_at"].isoformat() if course["started_at"] else None,
                    "completed_at": course["completed_at"].isoformat() if course["completed_at"] else None,
                    "last_accessed": course["last_accessed"].isoformat() if course["last_accessed"] else None
                }
                for course in courses
            ]
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get user progress: {str(e)}")
        raise