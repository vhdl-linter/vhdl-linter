package generic_pkg is
  generic (
    generic_parameter : integer := 0
    );
end package;
package body generic_pkg is
  -- vhdl-linter-disable-next-line multiple-definitions
  constant generic_parameter : integer := 0;  --multiple declaration (disable to get only one error)

end package body;
