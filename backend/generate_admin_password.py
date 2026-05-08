from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

password = input("Введите пароль админа: ")
password_hash = pwd_context.hash(password)

print(f"\nХеш пароля:")
print(password_hash)
print(f"\nДобавьте это значение в ADMIN_PASSWORD_HASH в файле .env")
