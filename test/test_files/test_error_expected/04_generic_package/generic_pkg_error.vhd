package generic_pkg_error is
  generic (
    generic_parameter : integer := 0
    );
end package;
package body generic_pkg_error is
    constant generic_parameter : integer := 0; --multiple declaration

end package body;