# Add project specific ProGuard rules here.
-keepattributes Signature, *Annotation*, InnerClasses, EnclosingMethod

# kotlinx.serialization
-keepclasseswithmembers class **.*$Companion {
    kotlinx.serialization.KSerializer serializer(...);
}
-if class **.*$Companion {
    kotlinx.serialization.KSerializer serializer(...);
}
-keepclassmembers class <1>.<2> {
    <1>.<2>$Companion Companion;
}
