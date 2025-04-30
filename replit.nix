{pkgs}: {
  deps = [
    pkgs.wireshark
    pkgs.tcpdump
    pkgs.sox
    pkgs.imagemagickBig
    pkgs.clickhouse
    pkgs.glibcLocales
    pkgs.zip
    pkgs.postgresql
    pkgs.openssl
  ];
}
