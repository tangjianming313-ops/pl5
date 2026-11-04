plugins { id("com.android.application") }
android { namespace = "com.laizongai.p5"; compileSdk = 35
 defaultConfig { applicationId = "com.laizongai.p5"; minSdk = 24; targetSdk = 35; versionCode = 2; versionName = "1.1.0" }
 buildTypes { release { isMinifyEnabled = false } }
 compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
}
