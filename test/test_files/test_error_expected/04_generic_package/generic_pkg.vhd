package generic_pkg is
  generic (
    generic_parameter : not_exists := 0  --dummy error
    );
end package;